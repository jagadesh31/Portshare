package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"html"
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
	TotalRequests  int64            `json:"totalRequests"`
	StatusCounts   map[string]int64 `json:"statusCounts"`
	BytesIn        int64            `json:"bytesIn"`
	BytesOut       int64            `json:"bytesOut"`
	BandwidthUsed  int64            `json:"bandwidthUsed"`
	BandwidthLimit int64            `json:"bandwidthLimit"`
}

var statsStore = struct {
	sync.RWMutex
	data map[string]*clientStats
}{data: make(map[string]*clientStats)}

func headerTransferBytes(headers map[string][]string) int64 {
	var n int64
	for name, values := range headers {
		for _, value := range values {
			// name + ": " + value + "\r\n"
			n += int64(len(name) + len(value) + 4)
		}
	}
	return n
}

func requestTransferBytes(c *gin.Context, body []byte) int64 {
	// Approximate on-the-wire size: request line + headers + body.
	n := int64(len(body))
	n += int64(len(c.Request.Method) + 1 + len(c.Request.URL.RequestURI()) + len(" HTTP/1.1\r\n"))
	n += headerTransferBytes(c.Request.Header)
	return n
}

func responseTransferBytes(status int, headers map[string][]string, body []byte) int64 {
	n := int64(len(body))
	n += int64(len(fmt.Sprintf("HTTP/1.1 %d\r\n", status)))
	n += headerTransferBytes(headers)
	return n
}

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

	out := clientStats{StatusCounts: make(map[string]int64)}
	statsStore.RLock()
	if s, ok := statsStore.data[clientID]; ok {
		out.TotalRequests = s.TotalRequests
		out.BytesIn = s.BytesIn
		out.BytesOut = s.BytesOut
		for k, v := range s.StatusCounts {
			out.StatusCounts[k] = v
		}
	}
	statsStore.RUnlock()

	clientStore.RLock()
	if client, ok := clientStore.clients[clientID]; ok {
		out.BandwidthUsed = client.BandwidthUsed
		out.BandwidthLimit = client.BandwidthLimit
	}
	clientStore.RUnlock()

	c.JSON(http.StatusOK, out)
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

func portShareRootURL() string {
	root := strings.TrimSpace(os.Getenv("PORTSHARE_ROOT_DOMAIN"))
	if root == "" {
		return "https://portshare.kexoz.dev"
	}
	return "https://" + root
}

func renderPortShareStatusPage(title, pill, heading, body, host, ctaLabel, ctaHref string) []byte {
	hostBlock := ""
	if host != "" {
		hostBlock = `<div class="host">` + html.EscapeString(host) + `</div>`
	}
	return []byte(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>` + html.EscapeString(title) + `</title>
  <style>
    :root {
      --bg: #07080a;
      --card: #10141b;
      --border: rgba(255,255,255,0.1);
      --text: #e8eaef;
      --muted: #9aa3b2;
      --soft: #6b7380;
      --green: #3dd68c;
      --warn: #fbbf24;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif;
      color: var(--text);
      background:
        radial-gradient(ellipse 70% 50% at 50% 0%, rgba(61,214,140,0.12), transparent 55%),
        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
        var(--bg);
      background-size: auto, 48px 48px, 48px 48px, auto;
    }
    .shell {
      width: min(460px, 100%);
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 28px 28px 24px;
      box-shadow: 0 28px 70px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.03) inset;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 22px;
      font-weight: 700;
      letter-spacing: -0.03em;
      font-size: 15px;
    }
    .brand-mark {
      width: 28px; height: 28px; border-radius: 8px;
      background: #0b0d12; border: 1px solid var(--border);
      display: grid; place-items: center;
    }
    .brand-mark span {
      width: 10px; height: 10px; border-radius: 50%;
      border: 2px solid #fff;
      box-shadow: 0 0 0 3px rgba(61,214,140,0.35);
    }
    .pill {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 4px 10px; border-radius: 999px;
      border: 1px solid rgba(251,191,36,0.28);
      background: rgba(251,191,36,0.1);
      color: var(--warn);
      font-size: 11px; font-weight: 700;
      letter-spacing: 0.06em; text-transform: uppercase;
      margin-bottom: 12px;
    }
    .pill.offline {
      border-color: rgba(154,163,178,0.35);
      background: rgba(154,163,178,0.1);
      color: var(--muted);
    }
    .pill i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    h1 {
      margin: 0 0 10px;
      font-size: 22px; line-height: 1.25;
      letter-spacing: -0.03em;
    }
    p {
      margin: 0 0 12px;
      color: var(--muted);
      font-size: 14px; line-height: 1.55;
    }
    .host {
      margin: 16px 0 20px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.03);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      color: var(--green);
      word-break: break-all;
    }
    .actions { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 100%; border: none; border-radius: 10px;
      padding: 12px 16px; font-size: 14px; font-weight: 650;
      text-decoration: none; cursor: pointer;
      background: #fff; color: #0b0d12;
      transition: transform 0.15s ease, opacity 0.15s ease;
    }
    .btn:hover { transform: translateY(-1px); opacity: 0.95; }
    .btn-ghost {
      background: transparent; color: var(--muted);
      border: 1px solid var(--border);
    }
    .btn-ghost:hover { color: var(--text); border-color: rgba(255,255,255,0.2); }
    .muted {
      margin-top: 16px; text-align: center;
      font-size: 12px; color: var(--soft);
    }
    .muted a { color: var(--muted); text-decoration: underline; text-underline-offset: 2px; }
    .code {
      display: block;
      margin-top: 14px;
      padding: 12px 14px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: rgba(0,0,0,0.28);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      color: #c5cad3;
      line-height: 1.55;
      text-align: left;
    }
    .code em { color: var(--green); font-style: normal; }
  </style>
</head>
<body>
  <div class="shell">
    <div class="brand">
      <div class="brand-mark" aria-hidden="true"><span></span></div>
      PortShare
    </div>
    <div class="pill ` + pillClass(pill) + `"><i></i>` + html.EscapeString(pill) + `</div>
    <h1>` + html.EscapeString(heading) + `</h1>
    <p>` + body + `</p>
    ` + hostBlock + `
    <div class="actions">
      <a class="btn" href="` + html.EscapeString(ctaHref) + `">` + html.EscapeString(ctaLabel) + `</a>
      <a class="btn btn-ghost" href="` + portShareRootURL() + `/pricing">See pricing</a>
    </div>
    <div class="muted">
      Built by Kexoz · <a href="` + portShareRootURL() + `">Get PortShare</a>
    </div>
  </div>
</body>
</html>`)
}

func pillClass(pill string) string {
	if strings.EqualFold(pill, "offline") || strings.EqualFold(pill, "tunnel offline") {
		return "offline"
	}
	return ""
}

func HandlePublicTunnel(c *gin.Context) {
	clientID := clientForHost(c.Request.Host)
	if clientID == "" {
		if strings.Contains(c.GetHeader("Accept"), "text/html") {
			host := c.Request.Host
			label := host
			root := strings.ToLower(os.Getenv("PORTSHARE_ROOT_DOMAIN"))
			if root != "" && strings.HasSuffix(strings.ToLower(host), "."+root) {
				label = strings.TrimSuffix(strings.ToLower(host), "."+root)
			}
			c.Data(http.StatusNotFound, "text/html; charset=utf-8", renderPortShareStatusPage(
				"Tunnel not found - PortShare",
				"404 not found",
				"This tunnel doesn't exist yet",
				`Nobody has claimed <strong style="color:#e8eaef">`+html.EscapeString(label)+`</strong> on PortShare. Claim it in the desktop app and point it at any local port.`+
					`<span class="code">Claim <em>`+html.EscapeString(label)+`</em><br>Expose localhost:3000<br>Share your public URL</span>`,
				host,
				"Claim a free subdomain",
				portShareRootURL(),
			))
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
			c.Data(http.StatusBadGateway, "text/html; charset=utf-8", renderPortShareStatusPage(
				"Tunnel Offline - PortShare",
				"Tunnel offline",
				"The tunnel is offline",
				`This subdomain is claimed, but the developer's PortShare client isn't connected right now. Ask them to open the desktop app — or spin up your own tunnel in seconds.`,
				c.Request.Host,
				"Get PortShare",
				portShareRootURL(),
			))
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
    <title>PortShare Tunnel Warning</title>
    <style>
      :root {
        --bg: #07080a;
        --card: #10141b;
        --border: rgba(255,255,255,0.1);
        --text: #e8eaef;
        --muted: #9aa3b2;
        --soft: #6b7380;
        --green: #3dd68c;
        --warn: #fbbf24;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif;
        color: var(--text);
        background:
          radial-gradient(ellipse 70% 50% at 50% 0%, rgba(61,214,140,0.12), transparent 55%),
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
          var(--bg);
        background-size: auto, 48px 48px, 48px 48px, auto;
      }
      .shell {
        width: min(440px, 100%);
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 28px 28px 24px;
        box-shadow: 0 28px 70px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.03) inset;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 22px;
        font-weight: 700;
        letter-spacing: -0.03em;
        font-size: 15px;
      }
      .brand-mark {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        background: #0b0d12;
        border: 1px solid var(--border);
        display: grid;
        place-items: center;
      }
      .brand-mark span {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        border: 2px solid #fff;
        box-shadow: 0 0 0 3px rgba(61,214,140,0.35);
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 4px 10px;
        border-radius: 999px;
        border: 1px solid rgba(251,191,36,0.28);
        background: rgba(251,191,36,0.1);
        color: var(--warn);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        margin-bottom: 12px;
      }
      .pill i {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--warn);
      }
      h1 {
        margin: 0 0 10px;
        font-size: 22px;
        line-height: 1.25;
        letter-spacing: -0.03em;
      }
      p {
        margin: 0 0 12px;
        color: var(--muted);
        font-size: 14px;
        line-height: 1.55;
      }
      p strong { color: var(--text); font-weight: 600; }
      .host {
        margin: 16px 0 20px;
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid var(--border);
        background: rgba(255,255,255,0.03);
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 12px;
        color: var(--green);
        word-break: break-all;
      }
      .btn {
        width: 100%;
        border: none;
        border-radius: 10px;
        padding: 12px 16px;
        font-size: 14px;
        font-weight: 650;
        cursor: pointer;
        background: #fff;
        color: #0b0d12;
        transition: transform 0.15s ease, opacity 0.15s ease;
      }
      .btn:hover { transform: translateY(-1px); opacity: 0.95; }
      .muted {
        margin-top: 16px;
        text-align: center;
        font-size: 12px;
        color: var(--soft);
      }
      .muted a { color: var(--muted); text-decoration: underline; text-underline-offset: 2px; }
    </style>
</head>
<body>
    <div class="shell">
        <div class="brand">
          <div class="brand-mark" aria-hidden="true"><span></span></div>
          PortShare
        </div>
        <div class="pill"><i></i> Tunnel warning</div>
        <h1>You're about to open a localhost tunnel</h1>
        <p>This URL is forwarded to a developer's machine through PortShare. The page behind it is user-hosted and not reviewed by us.</p>
        <p><strong>Continue only if you trust who shared this link.</strong></p>
        <div class="host">`+html.EscapeString(c.Request.Host)+`</div>
        <form method="POST">
            <input type="hidden" name="action" value="continue">
            <button type="submit" class="btn">I understand, continue</button>
        </form>
        <div class="muted">
            Suspicious link? <a href="https://`+os.Getenv("PORTSHARE_ROOT_DOMAIN")+`/abuse">Report abuse</a>
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
	bytesIn := requestTransferBytes(c, body)
	select {
	case response := <-responseChannel:
		if response.Error != "" {
			recordRequestStats(clientID, http.StatusBadGateway, bytesIn, 0)
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
			recordRequestStats(clientID, http.StatusBadGateway, bytesIn, 0)
			c.JSON(http.StatusBadGateway, gin.H{"message": "invalid tunnel response"})
			return
		}
		status := response.Status
		if status < 100 {
			status = http.StatusBadGateway
		}
		recordRequestStats(clientID, status, bytesIn, responseTransferBytes(status, response.Headers, decoded))
		c.Status(status)
		if _, writeErr := c.Writer.Write(decoded); writeErr != nil {
			return
		}
	case <-time.After(60 * time.Second):
		recordRequestStats(clientID, http.StatusGatewayTimeout, bytesIn, 0)
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
