package routes

import (
	"server/internal/services"

	"github.com/gin-gonic/gin"
)

func StatsRoutes(r *gin.Engine) {
	stats := r.Group("/stats")
	stats.GET("/global", services.GetGlobalStats)
}
