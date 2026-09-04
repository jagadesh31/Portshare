package routes

import (
	"server/internal/services"

	"github.com/gin-gonic/gin"
)

func SubdomainRoutes(r *gin.Engine) {
	subdomain := r.Group("/subdomain")
	subdomain.GET("/check", services.CheckSubdomain)
	subdomain.POST("/claim", services.ClaimSubdomain)
}
