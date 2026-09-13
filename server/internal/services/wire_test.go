package services

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/websocket"
)

func TestTunnelFrameRoundTrip(t *testing.T) {
	meta := []byte(`{"id":"abc","method":"GET"}`)
	body := []byte{0x00, 0x01, 0xfe, 0xff, 'h', 'i'}
	frame := encodeTunnelFrame(meta, body)

	gotMeta, gotBody, err := decodeTunnelFrame(frame)
	if err != nil {
		t.Fatalf("decode: %v", err)
	}
	if !bytes.Equal(gotMeta, meta) {
		t.Errorf("meta = %q, want %q", gotMeta, meta)
	}
	if !bytes.Equal(gotBody, body) {
		t.Errorf("body = %v, want %v", gotBody, body)
	}
}

func TestDecodeTunnelFrame_EmptyBody(t *testing.T) {
	meta := []byte(`{"id":"x"}`)
	_, body, err := decodeTunnelFrame(encodeTunnelFrame(meta, nil))
	if err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(body) != 0 {
		t.Errorf("body = %v, want empty", body)
	}
}

func TestDecodeTunnelFrame_RejectsBadInput(t *testing.T) {
	if _, _, err := decodeTunnelFrame([]byte{0, 1, 2}); err == nil {
		t.Error("expected error for short frame")
	}
	// metaLen claims more than available.
	bad := []byte{0, 0, 0, 99, 'a'}
	if _, _, err := decodeTunnelFrame(bad); err == nil {
		t.Error("expected error for oversized meta length")
	}
}

// websocketPair returns a connected server/client WebSocket pair for tests.
func websocketPair(t *testing.T) (*websocket.Conn, *websocket.Conn) {
	t.Helper()
	upgrader := websocket.Upgrader{CheckOrigin: func(*http.Request) bool { return true }}
	connCh := make(chan *websocket.Conn, 1)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		connCh <- conn
	}))
	t.Cleanup(srv.Close)
	url := "ws" + strings.TrimPrefix(srv.URL, "http")
	client, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	t.Cleanup(func() { _ = client.Close() })
	server := <-connCh
	t.Cleanup(func() { _ = server.Close() })
	return server, client
}

func TestTunnelConnectionBinaryRoundTrip(t *testing.T) {
	server, client := websocketPair(t)
	tc := &tunnelConnection{conn: server, binary: true}

	req := &tunnelRequest{
		ID: "req-1", Method: "POST", Path: "/api",
		Headers: map[string][]string{"X-Test": {"yes"}},
		Body:    []byte("raw request body"),
	}
	if err := tc.writeRequest(req); err != nil {
		t.Fatalf("writeRequest: %v", err)
	}

	messageType, data, err := client.ReadMessage()
	if err != nil {
		t.Fatalf("client read: %v", err)
	}
	if messageType != websocket.BinaryMessage {
		t.Fatalf("message type = %d, want binary", messageType)
	}
	meta, body, err := decodeTunnelFrame(data)
	if err != nil {
		t.Fatalf("decode frame: %v", err)
	}
	var m tunnelMeta
	if err := json.Unmarshal(meta, &m); err != nil {
		t.Fatalf("unmarshal meta: %v", err)
	}
	if m.ID != "req-1" || m.Method != "POST" || m.Path != "/api" {
		t.Errorf("meta = %+v", m)
	}
	if !bytes.Equal(body, []byte("raw request body")) {
		t.Errorf("body = %q", body)
	}

	// Client replies in binary framing.
	respMeta, _ := json.Marshal(tunnelMeta{ID: "req-1", Status: 201, Headers: map[string][]string{"X-Out": {"z"}}})
	if err := client.WriteMessage(websocket.BinaryMessage, encodeTunnelFrame(respMeta, []byte("raw response"))); err != nil {
		t.Fatalf("client write: %v", err)
	}
	resp, err := tc.readResponse()
	if err != nil {
		t.Fatalf("readResponse: %v", err)
	}
	if resp.ID != "req-1" || resp.Status != 201 {
		t.Errorf("resp = %+v", resp)
	}
	if !bytes.Equal(resp.Body, []byte("raw response")) {
		t.Errorf("resp body = %q", resp.Body)
	}
}

func TestTunnelConnectionLegacyRoundTrip(t *testing.T) {
	server, client := websocketPair(t)
	tc := &tunnelConnection{conn: server, binary: false}

	req := &tunnelRequest{ID: "legacy-1", Method: "GET", Path: "/old", Body: []byte("legacy body")}
	if err := tc.writeRequest(req); err != nil {
		t.Fatalf("writeRequest: %v", err)
	}

	messageType, data, err := client.ReadMessage()
	if err != nil {
		t.Fatalf("client read: %v", err)
	}
	if messageType != websocket.TextMessage {
		t.Fatalf("message type = %d, want text (legacy JSON)", messageType)
	}
	var legacy struct {
		ID   string `json:"id"`
		Body string `json:"body"`
	}
	if err := json.Unmarshal(data, &legacy); err != nil {
		t.Fatalf("unmarshal legacy: %v", err)
	}
	if legacy.ID != "legacy-1" {
		t.Errorf("legacy id = %q", legacy.ID)
	}
	decoded, err := base64.StdEncoding.DecodeString(legacy.Body)
	if err != nil || !bytes.Equal(decoded, []byte("legacy body")) {
		t.Errorf("legacy body decode = %q, err %v", decoded, err)
	}

	// Client replies with legacy JSON (base64 body via []byte auto-encoding).
	respJSON, _ := json.Marshal(tunnelResponse{ID: "legacy-1", Status: 200, Body: []byte("legacy resp")})
	if err := client.WriteMessage(websocket.TextMessage, respJSON); err != nil {
		t.Fatalf("client write: %v", err)
	}
	resp, err := tc.readResponse()
	if err != nil {
		t.Fatalf("readResponse: %v", err)
	}
	if resp.Status != 200 || !bytes.Equal(resp.Body, []byte("legacy resp")) {
		t.Errorf("legacy resp = %+v body=%q", resp, resp.Body)
	}
}
