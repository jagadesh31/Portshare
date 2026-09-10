package services

import (
	"net/http"

	"github.com/gin-gonic/gin"
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

	// Mock Stripe Checkout URL logic
	// In reality this would call the Stripe API and return a session.url
	checkoutURL := "/pricing/checkout?clientId=" + input.ClientID
	c.JSON(http.StatusOK, gin.H{"url": checkoutURL})
}

func MockPaymentWebhook(c *gin.Context) {
	var input struct {
		ClientID string `json:"clientId"`
	}
	if err := c.ShouldBindJSON(&input); err != nil || input.ClientID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "clientId is required"})
		return
	}

	clientStore.Lock()
	client, found := clientStore.clients[input.ClientID]
	if found {
		client.Plan = "pro"
		client.BandwidthLimit = 100 * 1024 * 1024 * 1024 // 100GB
	}
	clientStore.Unlock()

	if found && clientDatabase != nil {
		_, _ = clientDatabase.Exec("UPDATE clients SET plan = 'pro', bandwidth_limit = $1 WHERE id = $2", client.BandwidthLimit, input.ClientID)
	}

	c.JSON(http.StatusOK, gin.H{"message": "upgraded"})
}
