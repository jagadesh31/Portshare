package routes

import (
	"server/internal/services"

	"github.com/gin-gonic/gin"
)

func AuthRoutes(r *gin.Engine) {
	auth := r.Group("/auth")

	// Google OAuth2 flow
	auth.GET("/google/login", services.GoogleLoginHandler)
	auth.GET("/google/callback", services.GoogleCallbackHandler)
	auth.GET("/google/logout", services.GoogleLogoutHandler)
	auth.GET("/google/status", services.GAuthStatusHandler)
}
