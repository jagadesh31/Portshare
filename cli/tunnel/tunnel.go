package tunnel

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type TunnelRequest struct {
	ID      string              `json:"id"`
	Method  string              `json:"method"`
	Path    string              `json:"path"`
	Headers map[string][]string `json:"headers"`
	Body    string              `json:"body,omitempty"`
}

type TunnelResponse struct {
	ID      string              `json:"id"`
	Status  int                 `json:"status"`
	Headers map[string][]string `json:"headers"`
	Body    string              `json:"body,omitempty"`
	Error   string              `json:"error,omitempty"`
}

type Tunnel struct {
	ServerURL string
	ClientID  string
	LocalPort int

	conn *websocket.Conn
	mu   sync.Mutex
}

func (t *Tunnel) Start() error {
	serverURL, err := url.Parse(t.ServerURL)
	if err != nil {
		return err
	}
	scheme := "ws"
	if serverURL.Scheme == "https" {
		scheme = "wss"
	}
	wsURL := fmt.Sprintf("%s://%s/tunnel/connect?clientId=%s", scheme, serverURL.Host, t.ClientID)
	
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		return fmt.Errorf("failed to connect to tunnel: %w", err)
	}
	t.conn = conn
	defer conn.Close()

	fmt.Printf("Tunnel connected to %s\n", t.ServerURL)
	fmt.Printf("Forwarding requests to http://localhost:%d\n", t.LocalPort)

	for {
		var req TunnelRequest
		if err := conn.ReadJSON(&req); err != nil {
			return fmt.Errorf("tunnel connection closed: %w", err)
		}
		go t.handleRequest(req)
	}
}

func (t *Tunnel) handleRequest(req TunnelRequest) {
	resp := TunnelResponse{
		ID:      req.ID,
		Headers: make(map[string][]string),
	}

	var reqBody io.Reader
	if req.Body != "" {
		decodedBody, err := base64.StdEncoding.DecodeString(req.Body)
		if err != nil {
			resp.Error = "invalid request body encoding"
			t.sendResponse(resp)
			return
		}
		reqBody = bytes.NewReader(decodedBody)
	}

	localURL := fmt.Sprintf("http://localhost:%d%s", t.LocalPort, req.Path)
	httpReq, err := http.NewRequest(req.Method, localURL, reqBody)
	if err != nil {
		resp.Error = fmt.Sprintf("failed to create local request: %v", err)
		t.sendResponse(resp)
		return
	}

	for k, v := range req.Headers {
		// Avoid passing hop-by-hop headers or host if we don't want to
		if strings.ToLower(k) != "host" {
			httpReq.Header[k] = v
		}
	}

	client := &http.Client{
		Timeout: 30 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse // do not follow redirects
		},
	}

	httpResp, err := client.Do(httpReq)
	if err != nil {
		resp.Error = fmt.Sprintf("local server error: %v", err)
		t.sendResponse(resp)
		return
	}
	defer httpResp.Body.Close()

	resp.Status = httpResp.StatusCode
	for k, v := range httpResp.Header {
		resp.Headers[k] = v
	}

	respBody, err := io.ReadAll(httpResp.Body)
	if err != nil {
		resp.Error = fmt.Sprintf("failed to read local response: %v", err)
		t.sendResponse(resp)
		return
	}

	if len(respBody) > 0 {
		resp.Body = base64.StdEncoding.EncodeToString(respBody)
	}

	t.sendResponse(resp)
}

func (t *Tunnel) sendResponse(resp TunnelResponse) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if err := t.conn.WriteJSON(resp); err != nil {
		fmt.Printf("failed to send response: %v\n", err)
	}
}
