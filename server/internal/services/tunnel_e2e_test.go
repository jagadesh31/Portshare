package services

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// TestHandlePublicTunnelBinaryEndToEnd exercises the whole public request
// path with the real connect handler: HTTP request -> tunnelStore -> binary
// frame -> client binary response -> ConnectTunnel dispatcher -> HTTP response.
func TestHandlePublicTunnelBinaryEndToEnd(t *testing.T) {
	t.Setenv("PORTSHARE_ROOT_DOMAIN", "example.test")
	gin.SetMode(gin.TestMode)

	resetClientStore(t, map[string]*clientRecord{
		"u1": {ID: "u1", Subdomain: "demo", Plan: "free", BandwidthLimit: anonBandwidthLimit},
	})

	engine := gin.New()
	engine.GET("/tunnel/connect", ConnectTunnel)
	engine.NoRoute(HandlePublicTunnel)
	server := httptest.NewServer(engine)
	defer server.Close()

	// Real client: connect with proto=2, then answer one request.
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/tunnel/connect?clientId=u1&proto=2"
	clientConn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("dial tunnel: %v", err)
	}
	defer clientConn.Close()

	// Wait until the server registered the connection.
	deadline := time.Now().Add(3 * time.Second)
	for {
		tunnelStore.RLock()
		ready := tunnelStore.connections["u1"] != nil
		tunnelStore.RUnlock()
		if ready {
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("tunnel connection was not registered")
		}
		time.Sleep(10 * time.Millisecond)
	}

	clientErr := make(chan error, 1)
	go func() {
		messageType, data, err := clientConn.ReadMessage()
		if err != nil {
			clientErr <- err
			return
		}
		if messageType != websocket.BinaryMessage {
			t.Errorf("server sent message type %d, want binary", messageType)
			return
		}
		metaBytes, _, err := decodeTunnelFrame(data)
		if err != nil {
			clientErr <- err
			return
		}
		var meta tunnelMeta
		if err := json.Unmarshal(metaBytes, &meta); err != nil {
			clientErr <- err
			return
		}
		respMeta, _ := json.Marshal(tunnelMeta{
			ID:      meta.ID,
			Status:  http.StatusOK,
			Headers: map[string][]string{"Content-Type": {"text/plain"}},
		})
		clientErr <- clientConn.WriteMessage(websocket.BinaryMessage, encodeTunnelFrame(respMeta, []byte("hello from app")))
	}()

	req, err := http.NewRequest(http.MethodGet, server.URL+"/", nil)
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	req.Host = "demo.example.test"
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("do: %v", err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	if res.StatusCode != http.StatusOK {
		t.Errorf("status = %d, want 200", res.StatusCode)
	}
	if string(body) != "hello from app" {
		t.Errorf("body = %q, want %q", body, "hello from app")
	}
	if err := <-clientErr; err != nil {
		t.Errorf("client error: %v", err)
	}
}
