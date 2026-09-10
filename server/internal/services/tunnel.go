package services

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

const maxTunnelBody = 10 << 20
const tunnelPongWait = 60 * time.Second
const tunnelPingPeriod = (tunnelPongWait * 9) / 10

type tunnelConnection struct {
	conn *websocket.Conn
	mu   sync.Mutex
}

func (connection *tunnelConnection) writeJSON(value any) error {
	connection.mu.Lock()
	defer connection.mu.Unlock()
	return connection.conn.WriteJSON(value)
}

func (connection *tunnelConnection) ping() error {
	connection.mu.Lock()
	defer connection.mu.Unlock()
	return connection.conn.WriteControl(websocket.PingMessage, nil, time.Now().Add(10*time.Second))
}

type tunnelRequest struct {
	ID      string              `json:"id"`
	Method  string              `json:"method"`
	Path    string              `json:"path"`
	Headers map[string][]string `json:"headers"`
	Body    string              `json:"body,omitempty"`
}

type tunnelResponse struct {
	ID      string              `json:"id"`
	Status  int                 `json:"status"`
	Headers map[string][]string `json:"headers"`
	Body    string              `json:"body,omitempty"`
	Error   string              `json:"error,omitempty"`
}

var tunnelStore = struct {
	sync.RWMutex
	connections map[string]*tunnelConnection
	pending     map[string]chan tunnelResponse
}{connections: make(map[string]*tunnelConnection), pending: make(map[string]chan tunnelResponse)}

// clientStats tracks per-client request counters.
type clientStats struct {
	TotalRequests int64            `json:"totalRequests"`
	StatusCounts  map[string]int64 `json:"statusCounts"`
	BytesIn       int64            `json:"bytesIn"`
	BytesOut      int64            `json:"bytesOut"`
}

var statsStore = struct {
	sync.RWMutex
	data map[string]*clientStats
}{data: make(map[string]*clientStats)}

// recordRequestStats updates the in-memory stats for a client.
func recordRequestStats(clientID string, status int, bytesIn, bytesOut int64) {
	statsStore.Lock()
	defer statsStore.Unlock()
	s, ok := statsStore.data[clientID]
	if !ok {
		s = &clientStats{StatusCounts: make(map[string]int64)}
		statsStore.data[clientID] = s
	}
	s.TotalRequests++
	s.BytesIn += bytesIn
	s.BytesOut += bytesOut
	bucket := fmt.Sprintf("%dxx", status/100)
	s.StatusCounts[bucket]++

	// Persist bandwidth to database
	RecordBandwidth(clientID, bytesIn+bytesOut)
}

// GetClientStats returns JSON stats for a given clientId query param.
func GetClientStats(c *gin.Context) {
	clientID := strings.TrimSpace(c.Query("clientId"))
	if clientID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "clientId is required"})
		return
	}
	statsStore.RLock()
	s, ok := statsStore.data[clientID]
	statsStore.RUnlock()
	if !ok {
		// Return zeroed stats for clients with no traffic yet.
		c.JSON(http.StatusOK, clientStats{StatusCounts: make(map[string]int64)})
		return
	}
	statsStore.RLock()
	defer statsStore.RUnlock()
	c.JSON(http.StatusOK, s)
}

var tunnelUpgrader = websocket.Upgrader{
	ReadBufferSize:  16 << 10,
	WriteBufferSize: 16 << 10,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func ConnectTunnel(c *gin.Context) {
	clientID := strings.TrimSpace(c.Query("clientId"))
	if clientID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "clientId is required"})
		return
	}
	clientStore.RLock()
	_, found := clientStore.clients[clientID]
	clientStore.RUnlock()
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"message": "client identity not found"})
		return
	}
	conn, err := tunnelUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	connection := &tunnelConnection{conn: conn}
	_ = conn.SetReadDeadline(time.Now().Add(tunnelPongWait))
	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(tunnelPongWait))
	})
	tunnelStore.Lock()
	if previous := tunnelStore.connections[clientID]; previous != nil {
		_ = previous.conn.Close()
	}
	tunnelStore.connections[clientID] = connection
	tunnelStore.Unlock()
	defer func() {
		tunnelStore.Lock()
		if tunnelStore.connections[clientID] == connection {
			delete(tunnelStore.connections, clientID)
		}
		tunnelStore.Unlock()
		_ = conn.Close()
	}()

	pingTicker := time.NewTicker(tunnelPingPeriod)
	defer pingTicker.Stop()
	go func() {
		for range pingTicker.C {
			if err := connection.ping(); err != nil {
				_ = conn.Close()
				return
			}
		}
	}()

	for {
		var response tunnelResponse
		if err := conn.ReadJSON(&response); err != nil {
			return
		}
		tunnelStore.Lock()
		pending := tunnelStore.pending[response.ID]
		if pending != nil {
			delete(tunnelStore.pending, response.ID)
		}
		tunnelStore.Unlock()
		if pending != nil {
			pending <- response
		}
	}
}

func HandlePublicTunnel(c *gin.Context) {
	clientID := clientForHost(c.Request.Host)
	if clientID == "" {
		c.JSON(http.StatusNotFound, gin.H{"message": "tunnel host is not configured"})
		return
	}
	tunnelStore.RLock()
	connection := tunnelStore.connections[clientID]
	tunnelStore.RUnlock()
	if connection == nil {
		c.JSON(http.StatusBadGateway, gin.H{"message": "desktop tunnel is offline"})
		return
	}
	// Google Auth wall — redirects unauthenticated visitors if the client has
	// requireAuth enabled. No-op when GAuth is not configured server-side.
	if !RequireGAuth(c, clientID) {
		return
	}

	// Bandwidth Limit Check
	clientStore.RLock()
	clientRecord := clientStore.clients[clientID]
	isOverLimit := clientRecord != nil && clientRecord.BandwidthUsed >= clientRecord.BandwidthLimit
	clientStore.RUnlock()

	if isOverLimit {
		c.Data(http.StatusPaymentRequired, "text/html", []byte(`
			<!DOCTYPE html>
			<html><head><title>Bandwidth Limit Reached</title>
			<style>body { font-family: sans-serif; text-align: center; padding: 4rem; background: #fafafa; color: #333; } h1 { color: #e11d48; } .btn { display: inline-block; padding: 12px 24px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 1rem; }</style>
			</head><body>
			<h1>Bandwidth Limit Reached</h1>
			<p>This PortShare tunnel has exceeded its monthly bandwidth limit.</p>
			<p>The tunnel owner needs to upgrade to a Pro plan to continue receiving traffic.</p>
			</body></html>
		`))
		return
	}
	body, err := io.ReadAll(io.LimitReader(c.Request.Body, maxTunnelBody+1))
	if err != nil || len(body) > maxTunnelBody {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"message": "request body is too large"})
		return
	}
	requestID := newRequestID()
	responseChannel := make(chan tunnelResponse, 1)
	tunnelStore.Lock()
	tunnelStore.pending[requestID] = responseChannel
	tunnelStore.Unlock()
	defer func() {
		tunnelStore.Lock()
		delete(tunnelStore.pending, requestID)
		tunnelStore.Unlock()
	}()

	request := tunnelRequest{ID: requestID, Method: c.Request.Method, Path: c.Request.URL.RequestURI(), Headers: c.Request.Header, Body: base64.StdEncoding.EncodeToString(body)}
	writeErr := connection.writeJSON(request)
	if writeErr != nil {
		c.JSON(http.StatusBadGateway, gin.H{"message": "desktop tunnel connection failed"})
		return
	}
	select {
	case response := <-responseChannel:
		if response.Error != "" {
			recordRequestStats(clientID, http.StatusBadGateway, int64(len(body)), 0)
			c.JSON(http.StatusBadGateway, gin.H{"message": response.Error})
			return
		}
		for name, values := range response.Headers {
			for _, value := range values {
				c.Header(name, value)
			}
		}
		decoded, decodeErr := base64.StdEncoding.DecodeString(response.Body)
		if decodeErr != nil {
			recordRequestStats(clientID, http.StatusBadGateway, int64(len(body)), 0)
			c.JSON(http.StatusBadGateway, gin.H{"message": "invalid tunnel response"})
			return
		}
		recordRequestStats(clientID, response.Status, int64(len(body)), int64(len(decoded)))
		c.Data(response.Status, "application/octet-stream", decoded)
	case <-time.After(60 * time.Second):
		recordRequestStats(clientID, http.StatusGatewayTimeout, int64(len(body)), 0)
		c.JSON(http.StatusGatewayTimeout, gin.H{"message": "desktop tunnel response timed out"})
	}
}

func clientForHost(rawHost string) string {
	host := strings.ToLower(strings.Split(rawHost, ":")[0])
	clientStore.RLock()
	defer clientStore.RUnlock()
	for clientID, client := range clientStore.clients {
		if client.CustomDomain == host {
			return clientID
		}
	}
	rootDomain := strings.ToLower(os.Getenv("PORTSHARE_ROOT_DOMAIN"))
	if rootDomain == "" {
		return ""
	}
	suffix := "." + rootDomain
	if strings.HasSuffix(host, suffix) {
		name := strings.TrimSuffix(host, suffix)
		if owner, found := clientStore.subdomains[name]; found {
			return owner
		}
	}
	return ""
}

func newRequestID() string {
	value := make([]byte, 12)
	if _, err := rand.Read(value); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(value)
}
