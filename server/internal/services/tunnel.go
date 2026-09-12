package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"golang.org/x/time/rate"
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
			// Ignore expected disconnects (client closed app, network drop, TCP reset).
			if !isExpectedWSClose(err) {
				log.Printf("[tunnel] unexpected read error for client %s: %v", clientID, err)
			}
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

// isExpectedWSClose returns true for errors that are normal client-disconnect
// scenarios: clean WebSocket close frames, TCP resets, EOF, or I/O timeouts.
func isExpectedWSClose(err error) bool {
	if websocket.IsCloseError(err,
		websocket.CloseNormalClosure,
		websocket.CloseGoingAway,
		websocket.CloseAbnormalClosure,
		websocket.CloseNoStatusReceived,
	) {
		return true
	}
	// io.EOF / io.ErrUnexpectedEOF — pipe closed
	if errors.Is(err, io.EOF) || errors.Is(err, io.ErrUnexpectedEOF) {
		return true
	}
	msg := err.Error()
	// Windows TCP reset: "wsarecv: An existing connection was forcibly closed"
	// Linux equivalent: "connection reset by peer" / "broken pipe"
	for _, fragment := range []string{
		"forcibly closed",
		"connection reset by peer",
		"broken pipe",
		"use of closed network connection",
		"i/o timeout",
	} {
		if strings.Contains(msg, fragment) {
			return true
		}
	}
	return false
}

var ipRateLimiters = struct {
	sync.RWMutex
	limiters map[string]*rate.Limiter
}{limiters: make(map[string]*rate.Limiter)}

func getIPLimiter(ip string) *rate.Limiter {
	ipRateLimiters.RLock()
	limiter, exists := ipRateLimiters.limiters[ip]
	ipRateLimiters.RUnlock()

	if !exists {
		ipRateLimiters.Lock()
		defer ipRateLimiters.Unlock()
		limiter, exists = ipRateLimiters.limiters[ip]
		if !exists {
			// 30 requests per second, burst of 60
			limiter = rate.NewLimiter(30, 60)
			ipRateLimiters.limiters[ip] = limiter
		}
	}
	return limiter
}

func HandlePublicTunnel(c *gin.Context) {
	clientID := clientForHost(c.Request.Host)
	if clientID == "" {
		if strings.Contains(c.GetHeader("Accept"), "text/html") {
			c.Redirect(http.StatusFound, "https://"+os.Getenv("PORTSHARE_ROOT_DOMAIN"))
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"message": "tunnel host is not configured"})
		return
	}
	tunnelStore.RLock()
	connection := tunnelStore.connections[clientID]
	tunnelStore.RUnlock()

	sshStore.RLock()
	sshConnection := sshStore.connections[clientID]
	sshStore.RUnlock()

	// 1. IP Rate Limiting (Anti-Abuse)
	clientIP := c.ClientIP()
	if !getIPLimiter(clientIP).Allow() {
		c.JSON(http.StatusTooManyRequests, gin.H{"message": "rate limit exceeded. please slow down."})
		return
	}

	if connection == nil && sshConnection == nil {
		if strings.Contains(c.GetHeader("Accept"), "text/html") {
			c.Data(http.StatusBadGateway, "text/html; charset=utf-8", []byte(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tunnel Offline - PortShare</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #09090b; color: #f0f0f2; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .card { background: #13131a; border: 1px solid rgba(139, 92, 246, 0.15); padding: 40px; border-radius: 16px; text-align: center; max-width: 400px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
        h1 { margin: 0 0 16px; font-size: 24px; color: #ffffff; }
        p { color: #8a8a96; line-height: 1.5; margin-bottom: 24px; }
        a { display: inline-block; background: #8b5cf6; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; transition: background 0.2s; }
        a:hover { background: #7c3aed; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Tunnel is Offline</h1>
        <p>The developer's local environment is currently disconnected. Please try again later.</p>
        <a href="https://`+os.Getenv("PORTSHARE_ROOT_DOMAIN")+`">Get your own PortShare tunnel</a>
    </div>
</body>
</html>`))
			return
		}
		c.JSON(http.StatusBadGateway, gin.H{"message": "desktop tunnel is offline"})
		return
	}

	if sshConnection != nil {
		proxy := &httputil.ReverseProxy{
			Director: func(req *http.Request) {
				req.URL.Scheme = "http"
				req.URL.Host = "localhost"
			},
			Transport: &http.Transport{
				DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
					return openSSHChannel(sshConnection)
				},
			},
		}
		proxy.ServeHTTP(c.Writer, c.Request)
		return
	}


	// Interstitial Warning Page to prevent automated phishing scanners from flagging the domain.
	if strings.Contains(c.GetHeader("Accept"), "text/html") {
		if _, err := c.Cookie("portshare_interstitial_accepted"); err != nil {
			if c.Request.Method == http.MethodPost && c.PostForm("action") == "continue" {
				c.SetCookie("portshare_interstitial_accepted", "1", 3600*24*30, "/", "", true, true)
				c.Redirect(http.StatusFound, c.Request.URL.String())
				return
			}
			
			c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Warning - PortShare</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #09090b; color: #f0f0f2; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .card { background: #13131a; border: 1px solid rgba(239, 68, 68, 0.2); padding: 40px; border-radius: 16px; text-align: center; max-width: 450px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
        h1 { margin: 0 0 16px; font-size: 22px; color: #ffffff; }
        p { color: #8a8a96; line-height: 1.6; margin-bottom: 24px; font-size: 15px; }
        .btn { display: inline-block; background: #ef4444; color: #ffffff; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s; width: 100%; font-size: 15px; }
        .btn:hover { background: #dc2626; }
        .muted { margin-top: 20px; font-size: 12px; color: #6b6b78; }
        .muted a { color: #8b5cf6; text-decoration: none; }
    </style>
</head>
<body>
    <div class="card">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        <h1>You are about to visit a PortShare Tunnel</h1>
        <p>This URL is served by a local developer's computer via PortShare. This content is user-generated and not vetted by PortShare.</p>
        <p><b>Only proceed if you trust the person who sent you this link.</b></p>
        <form method="POST">
            <input type="hidden" name="action" value="continue">
            <button type="submit" class="btn">I understand, continue to website</button>
        </form>
        <div class="muted">
            Is this a malicious site? <a href="https://`+os.Getenv("PORTSHARE_ROOT_DOMAIN")+`">Report Abuse</a>
        </div>
    </div>
</body>
</html>`))
			return
		}
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
			lower := strings.ToLower(name)
			if lower == "content-length" || lower == "transfer-encoding" || lower == "connection" {
				continue
			}
			for _, value := range values {
				c.Writer.Header().Add(name, value)
			}
		}
		decoded, decodeErr := base64.StdEncoding.DecodeString(response.Body)
		if decodeErr != nil {
			recordRequestStats(clientID, http.StatusBadGateway, int64(len(body)), 0)
			c.JSON(http.StatusBadGateway, gin.H{"message": "invalid tunnel response"})
			return
		}
		recordRequestStats(clientID, response.Status, int64(len(body)), int64(len(decoded)))
		status := response.Status
		if status < 100 {
			status = http.StatusBadGateway
		}
		c.Status(status)
		if _, writeErr := c.Writer.Write(decoded); writeErr != nil {
			return
		}
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
