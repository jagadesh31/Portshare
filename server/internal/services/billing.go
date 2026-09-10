package services

import (
	"encoding/json"
	"io"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/checkout/session"
	"github.com/stripe/stripe-go/v76/webhook"
)

func init() {
	stripe.Key = os.Getenv("STRIPE_SECRET_KEY")
}

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

	if stripe.Key == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Stripe is not configured on this server."})
		return
	}

	domain := "https://" + os.Getenv("PORTSHARE_ROOT_DOMAIN")
	
	params := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("usd"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name: stripe.String("PortShare Pro Plan"),
						Description: stripe.String("100GB Bandwidth, Custom Domains, Google Auth Walls"),
					},
					UnitAmount: stripe.Int64(1200), // $12.00
				},
				Quantity: stripe.Int64(1),
			},
		},
		Mode:       stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL: stripe.String(domain + "/download/portshare-desktop?payment=success"),
		CancelURL:  stripe.String(domain + "/pricing?payment=cancelled"),
		ClientReferenceID: stripe.String(input.ClientID),
	}

	s, err := session.New(params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create checkout session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": s.URL})
}

func StripeWebhook(c *gin.Context) {
	const MaxBodyBytes = int64(65536)
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, MaxBodyBytes)
	payload, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"message": "Error reading request body"})
		return
	}

	endpointSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	sigHeader := c.GetHeader("Stripe-Signature")
	
	event, err := webhook.ConstructEvent(payload, sigHeader, endpointSecret)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid webhook signature"})
		return
	}

	if event.Type == "checkout.session.completed" {
		var s stripe.CheckoutSession
		err := json.Unmarshal(event.Data.Raw, &s)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Error parsing webhook JSON"})
			return
		}

		clientID := s.ClientReferenceID
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
