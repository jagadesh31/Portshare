package routes

import (
	"server/internal/services"

	"github.com/gin-gonic/gin"
)

func AdminRoutes(r *gin.Engine) {
	// Public (pricing page + checkout need these).
	r.GET("/admin/plans", services.ListPlans)
	r.GET("/admin/coupons/validate", services.ValidateCoupon)
	r.GET("/admin/me", services.AdminMe)

	// Protected — Google session email must be in ADMIN_EMAILS.
	admin := r.Group("/admin")
	admin.Use(services.RequireAdmin)
	{
		admin.GET("/overview", services.AdminOverview)
		admin.POST("/plans", services.UpsertPlan)
		admin.DELETE("/plans/:id", services.DeletePlan)
		admin.GET("/coupons", services.ListCoupons)
		admin.POST("/coupons", services.UpsertCoupon)
		admin.DELETE("/coupons/:code", services.DeleteCoupon)
	}
}
