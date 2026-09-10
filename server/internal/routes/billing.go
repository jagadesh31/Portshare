package routes

import (
	"server/internal/services"

	"github.com/gin-gonic/gin"
)

func BillingRoutes(r *gin.Engine) {
	billing := r.Group("/client/billing")
	billing.GET("/", services.GetBillingDetails)
	billing.POST("/checkout", services.CreateCheckoutSession)
	billing.POST("/mock-webhook", services.MockPaymentWebhook)
}
