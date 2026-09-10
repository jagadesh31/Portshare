package services

import (
	"math"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetGlobalStats returns platform-wide aggregated statistics for the website.
func GetGlobalStats(c *gin.Context) {
	// Count active WebSocket tunnel connections
	tunnelStore.RLock()
	activeTunnels := len(tunnelStore.connections)
	tunnelStore.RUnlock()

	// Also count SSH connections
	sshStore.RLock()
	activeTunnels += len(sshStore.connections)
	sshStore.RUnlock()

	// Aggregate all client stats
	statsStore.RLock()
	var totalRequests int64
	var totalBytesIn, totalBytesOut int64
	for _, s := range statsStore.data {
		totalRequests += s.TotalRequests
		totalBytesIn += s.BytesIn
		totalBytesOut += s.BytesOut
	}
	statsStore.RUnlock()

	// Count unique client identities
	clientStore.RLock()
	developers := len(clientStore.clients)
	clientStore.RUnlock()

	totalBytes := totalBytesIn + totalBytesOut
	dataProxiedGB := math.Round(float64(totalBytes)/1e9*10) / 10

	c.Header("Cache-Control", "no-cache, no-store")
	c.JSON(http.StatusOK, gin.H{
		"totalRequests": totalRequests,
		"activeTunnels": activeTunnels,
		"developers":    developers,
		"dataProxiedGB": dataProxiedGB,
	})
}
