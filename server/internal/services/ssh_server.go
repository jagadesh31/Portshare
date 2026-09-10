package services

import (
	"fmt"
	"io"
	"net"
	"os"
	"sync"
	"time"

	"github.com/gliderlabs/ssh"
	gossh "golang.org/x/crypto/ssh"
)

var sshStore = struct {
	sync.RWMutex
	connections map[string]*gossh.ServerConn
}{connections: make(map[string]*gossh.ServerConn)}

func handleTCPIPForward(ctx ssh.Context, srv *ssh.Server, req *gossh.Request) (bool, []byte) {
	conn := ctx.Value(ssh.ContextKeyConn).(*gossh.ServerConn)
	clientID := ctx.User()

	clientStore.RLock()
	client, ok := clientStore.clients[clientID]
	clientStore.RUnlock()

	// Create anonymous client if not authenticated or using generic usernames
	if !ok || clientID == "" || clientID == "root" || clientID == "ubuntu" || clientID == "mac" || clientID == "user" {
		id := newClientID()
		client = &clientRecord{
			ID:             id,
			Plan:           "free",
			BandwidthLimit: 1073741824, // 1GB
		}
		clientStore.Lock()
		clientStore.clients[id] = client
		persistLocked()
		clientStore.Unlock()
		clientID = id
	}

	// Ensure subdomain is assigned
	if client.Subdomain == "" {
		client.Subdomain = newClientID()[:8]
		clientStore.Lock()
		clientStore.subdomains[client.Subdomain] = clientID
		persistLocked()
		clientStore.Unlock()
	}

	ctx.SetValue("clientID", clientID)

	sshStore.Lock()
	sshStore.connections[clientID] = conn
	sshStore.Unlock()

	var port uint32 = 80
	return true, gossh.Marshal(struct{ Port uint32 }{port})
}

func handleCancelTCPIPForward(ctx ssh.Context, srv *ssh.Server, req *gossh.Request) (bool, []byte) {
	clientID, _ := ctx.Value("clientID").(string)
	if clientID != "" {
		sshStore.Lock()
		delete(sshStore.connections, clientID)
		sshStore.Unlock()
	}
	return true, nil
}

func sshSessionHandler(s ssh.Session) {
	clientID, _ := s.Context().Value("clientID").(string)
	if clientID == "" {
		io.WriteString(s, "Error: No reverse tunnel requested.\n")
		io.WriteString(s, "Usage: ssh -R 80:localhost:<your-port> portshare.kexoz.dev\n")
		return
	}

	clientStore.RLock()
	client := clientStore.clients[clientID]
	clientStore.RUnlock()

	domain := client.Subdomain + "." + os.Getenv("PORTSHARE_ROOT_DOMAIN")
	if client.CustomDomain != "" {
		domain = client.CustomDomain
	}

	io.WriteString(s, "\033[32mPortShare Tunnel Established!\033[0m\n\n")
	io.WriteString(s, fmt.Sprintf("🌍 \033[1mhttps://%s\033[0m\n\n", domain))
	io.WriteString(s, "Press Ctrl+C to disconnect.\n")

	// Keep session open until client disconnects
	<-s.Context().Done()

	sshStore.Lock()
	if sshStore.connections[clientID] == s.Context().Value(ssh.ContextKeyConn).(*gossh.ServerConn) {
		delete(sshStore.connections, clientID)
	}
	sshStore.Unlock()
}

func StartSSHServer(addr string) error {
	srv := &ssh.Server{
		Addr:    addr,
		Handler: sshSessionHandler,
		RequestHandlers: map[string]ssh.RequestHandler{
			"tcpip-forward":        handleTCPIPForward,
			"cancel-tcpip-forward": handleCancelTCPIPForward,
		},
	}
	return srv.ListenAndServe()
}

type sshConnWrapper struct {
	gossh.Channel
	conn *gossh.ServerConn
}

func (w *sshConnWrapper) LocalAddr() net.Addr               { return w.conn.LocalAddr() }
func (w *sshConnWrapper) RemoteAddr() net.Addr              { return w.conn.RemoteAddr() }
func (w *sshConnWrapper) SetDeadline(t time.Time) error     { return nil }
func (w *sshConnWrapper) SetReadDeadline(t time.Time) error { return nil }
func (w *sshConnWrapper) SetWriteDeadline(t time.Time) error { return nil }

func openSSHChannel(conn *gossh.ServerConn) (net.Conn, error) {
	payload := struct {
		DestAddr   string
		DestPort   uint32
		OriginAddr string
		OriginPort uint32
	}{
		DestAddr:   "localhost",
		DestPort:   80,
		OriginAddr: "127.0.0.1",
		OriginPort: 0,
	}
	ch, reqs, err := conn.OpenChannel("forwarded-tcpip", gossh.Marshal(payload))
	if err != nil {
		return nil, err
	}
	go gossh.DiscardRequests(reqs)
	return &sshConnWrapper{Channel: ch, conn: conn}, nil
}
