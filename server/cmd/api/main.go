package main

import (
	"os"
	"server/internal/routes"
	"server/internal/services"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	for _, name := range []string{"DATABASE_URL", "PORTSHARE_ROOT_DOMAIN", "CORS_ORIGINS"} {
		if strings.TrimSpace(os.Getenv(name)) == "" {
			panic(name + " is required")
		}
	}
	if err := services.LoadClientStore(); err != nil {
		panic(err)
	}
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	config := cors.DefaultConfig()
	config.AllowOrigins = configuredOrigins()
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept"}
	r.Use(cors.New(config))

	routes.SubdomainRoutes(r)
	routes.AuthRoutes(r)
	routes.ClientRoutes(r)
	r.GET("/tunnel/connect", services.ConnectTunnel)

	r.GET("/health", func(ctx *gin.Context) {
		ctx.JSON(200, gin.H{
			"status": "ok",
		})
	})
	r.NoRoute(services.HandlePublicTunnel)

	port := os.Getenv("PORT")
	if port == "" {
		port = "9080"
	}
	if !strings.HasPrefix(port, ":") {
		port = ":" + port
	}
	if err := r.Run(port); err != nil {
		panic(err)
	}
}

func configuredOrigins() []string {
	value := os.Getenv("CORS_ORIGINS")
	if value == "" {
		return []string{"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"}
	}
	origins := make([]string, 0)
	for _, origin := range strings.Split(value, ",") {
		if trimmed := strings.TrimSpace(origin); trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	return origins
}
