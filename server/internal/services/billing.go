package services

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/razorpay/razorpay-go"
	"github.com/razorpay/razorpay-go/utils"
)

func GetBillingDetails(c *gin.Context) {
	clientID := c.Query("clientId")
	if clientID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "clientId is required"})
		return
	}

	clientStore.RLock()
	client, found := clientStore.clients[clientID]
	clientStore.RUnlock()

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"message": "client not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"plan":           client.Plan,
		"bandwidthUsed":  client.BandwidthUsed,
		"bandwidthLimit": client.BandwidthLimit,
	})
}

func CreateCheckoutSession(c *gin.Context) {
	var input struct {
		ClientID   string `json:"clientId"`
		PlanID     string `json:"planId"`
		CouponCode string `json:"couponCode"`
	}
	if err := c.ShouldBindJSON(&input); err != nil || input.ClientID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "clientId is required"})
		return
	}

	clientStore.RLock()
	_, found := clientStore.clients[input.ClientID]
	clientStore.RUnlock()

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"message": "client not found"})
		return
	}

	keyID := os.Getenv("RAZORPAY_KEY_ID")
	keySecret := os.Getenv("RAZORPAY_KEY_SECRET")

	if keyID == "" || keySecret == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Razorpay is not configured on this server."})
		return
	}

	client := razorpay.NewClient(keyID, keySecret)

	domain := "https://" + os.Getenv("PORTSHARE_ROOT_DOMAIN")

	// Resolve plan price (defaults to legacy Pro $12) and apply plan
	// discount + coupon discount.
	planID := strings.ToLower(strings.TrimSpace(input.PlanID))
	if planID == "" {
		planID = "pro"
	}
	amount := int64(1200)
	currency := "USD"
	description := "PortShare Pro Plan"
	bandwidthLimit := proBandwidthLimit
	if plans, err := listPlans(); err == nil {
		for _, p := range plans {
			if p.ID == planID && p.Active {
				amount = planPriceAfterDiscount(p)
				currency = p.Currency
				description = "PortShare " + p.Name + " Plan"
				bandwidthLimit = p.BandwidthLimit
				break
			}
		}
	}
	couponCode := strings.ToUpper(strings.TrimSpace(input.CouponCode))
	if couponCode != "" {
		if cp, found := getCoupon(couponCode); found && couponUsable(cp) {
			amount = applyCoupon(amount, cp)
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid or expired coupon"})
			return
		}
	}
	if amount < 50 {
		amount = 50 // payment-link minimum
	}

	data := map[string]interface{}{
		"amount":      amount,
		"currency":    currency,
		"description": description,
		"customer": map[string]interface{}{
			"name": "PortShare User",
		},
		"notes": map[string]interface{}{
			"clientId":       input.ClientID,
			"planId":         planID,
			"couponCode":     couponCode,
			"bandwidthLimit": bandwidthLimit,
		},
		"callback_url":    domain + "/download/portshare-desktop?payment=success",
		"callback_method": "get",
	}

	body, err := client.PaymentLink.Create(data, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create payment link"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": body["short_url"]})
}

func RazorpayWebhook(c *gin.Context) {
	const MaxBodyBytes = int64(65536)
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, MaxBodyBytes)
	payload, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"message": "Error reading request body"})
		return
	}

	secret := os.Getenv("RAZORPAY_WEBHOOK_SECRET")
	sigHeader := c.GetHeader("X-Razorpay-Signature")

	ok := utils.VerifyWebhookSignature(string(payload), sigHeader, secret)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid webhook signature"})
		return
	}

	var event struct {
		Event   string `json:"event"`
		Payload struct {
			PaymentLink struct {
				Entity struct {
					Notes map[string]string `json:"notes"`
				} `json:"entity"`
			} `json:"payment_link"`
		} `json:"payload"`
	}

	if err := json.Unmarshal(payload, &event); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Error parsing webhook JSON"})
		return
	}

	if event.Event == "payment_link.paid" {
		notes := event.Payload.PaymentLink.Entity.Notes
		clientID := notes["clientId"]
		if clientID != "" {
			planID := strings.ToLower(strings.TrimSpace(notes["planId"]))
			if planID == "" {
				planID = "pro"
			}
			bandwidthLimit := proBandwidthLimit // 100GB fallback
			if raw := strings.TrimSpace(notes["bandwidthLimit"]); raw != "" {
				if parsed, err := strconv.ParseInt(raw, 10, 64); err == nil && parsed > 0 {
					bandwidthLimit = parsed
				}
			}
			clientStore.Lock()
			client, found := clientStore.clients[clientID]
			if found {
				client.Plan = planID
				client.BandwidthLimit = bandwidthLimit
			}
			clientStore.Unlock()

			if found && clientDatabase != nil {
				_, _ = clientDatabase.Exec("UPDATE clients SET plan = $1, bandwidth_limit = $2 WHERE id = $3", planID, bandwidthLimit, clientID)
				if couponCode := strings.ToUpper(strings.TrimSpace(notes["couponCode"])); couponCode != "" {
					_, _ = clientDatabase.Exec("UPDATE coupons SET redeemed_count = redeemed_count + 1 WHERE code = $1", couponCode)
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}
