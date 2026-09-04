package routes

import (
	"server/internal/services"

	"github.com/gin-gonic/gin"
)

func ClientRoutes(r *gin.Engine) {
	client := r.Group("/client")
	client.POST("/identity", services.EnsureClientIdentity)
	client.PUT("/port", services.UpdateClientPort)
	client.PUT("/domain", services.UpdateClientDomain)
}
