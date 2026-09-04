package routes

import "github.com/gin-gonic/gin"

func AuthRoutes(r *gin.Engine) {
	auth := r.Group("/auth")
	auth.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "Hello from Auth Route",
		})
	})
}
