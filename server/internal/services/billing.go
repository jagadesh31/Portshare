package services

import (
	"encoding/json"
	"io"
	"net/http"
	"os"

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
		ClientID string `json:"clientId"`
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

	data := map[string]interface{}{
		"amount":       1200, // 12 USD in cents, or 12.00 INR in paisa depending on currency
		"currency":     "USD",
		"description":  "PortShare Pro Plan",
		"customer": map[string]interface{}{
			"name": "PortShare User",
		},
		"notes": map[string]interface{}{
			"clientId": input.ClientID,
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
		clientID := event.Payload.PaymentLink.Entity.Notes["clientId"]
		if clientID != "" {
			clientStore.Lock()
			client, found := clientStore.clients[clientID]
			if found {
				client.Plan = "pro"
				client.BandwidthLimit = 100 * 1024 * 1024 * 1024 // 100GB
			}
			clientStore.Unlock()

			if found && clientDatabase != nil {
				_, _ = clientDatabase.Exec("UPDATE clients SET plan = 'pro', bandwidth_limit = $1 WHERE id = $2", client.BandwidthLimit, clientID)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}
