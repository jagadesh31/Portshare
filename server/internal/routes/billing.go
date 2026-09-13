package routes

import (
	"github.com/gin-gonic/gin"
	"server/internal/services"
)

func BillingRoutes(r *gin.Engine) {
	billing := r.Group("/client/billing")
	{
		billing.GET("/details", services.GetBillingDetails)
		billing.POST("/checkout", services.CreateCheckoutSession)
		billing.POST("/webhook", services.RazorpayWebhook)
	}
}
