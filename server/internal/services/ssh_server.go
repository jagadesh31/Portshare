package services

import (
	"fmt"
	"io"
	"net"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gliderlabs/ssh"
	gossh "golang.org/x/crypto/ssh"
)

var sshStore = struct {
	sync.RWMutex
	connections map[string]*gossh.ServerConn
}{connections: make(map[string]*gossh.ServerConn)}

// sshAnonAttempts rate-limits anonymous SSH identity creation per remote IP
// to prevent DB bloat from unauthenticated clients requesting infinite IDs.
var sshAnonAttempts = struct {
	sync.Mutex
	counts map[string][]time.Time
}{counts: make(map[string][]time.Time)}

func sshAnonAllowed(remoteAddr string) bool {
	host, _, err := net.SplitHostPort(remoteAddr)
	if err != nil {
		host = remoteAddr
	}
	now := time.Now()
	cutoff := now.Add(-1 * time.Hour)
	sshAnonAttempts.Lock()
	defer sshAnonAttempts.Unlock()
	attempts := sshAnonAttempts.counts[host]
	fresh := attempts[:0]
	for _, t := range attempts {
		if t.After(cutoff) {
			fresh = append(fresh, t)
		}
	}
	if len(fresh) >= 10 {
		sshAnonAttempts.counts[host] = fresh
		return false
	}
	sshAnonAttempts.counts[host] = append(fresh, now)
	return true
}

func isGenericSSHUsername(name string) bool {
	switch strings.ToLower(strings.TrimSpace(name)) {
	case "", "root", "ubuntu", "mac", "user", "admin", "test":
		return true
	default:
		return false
	}
}

func handleTCPIPForward(ctx ssh.Context, srv *ssh.Server, req *gossh.Request) (bool, []byte) {
	conn := ctx.Value(ssh.ContextKeyConn).(*gossh.ServerConn)
	clientID := ctx.User()

	clientStore.RLock()
	client, ok := clientStore.clients[clientID]
	clientStore.RUnlock()

	// Create anonymous client if not authenticated or using generic usernames.
	// Rate-limited per IP to prevent identity farming.
	if !ok || isGenericSSHUsername(clientID) {
		if !sshAnonAllowed(ctx.RemoteAddr().String()) {
			return false, []byte("too many tunnel identities requested, try again later")
		}
		id := newClientID()
		client = &clientRecord{
			ID:             id,
			Plan:           "free",
			BandwidthLimit: anonBandwidthLimit, // 100 MB guest tier
		}
		clientStore.Lock()
		clientStore.clients[id] = client
		persistClientLocked(client)
		clientStore.Unlock()
		clientID = id
	}

	// Ensure subdomain is assigned (hold write lock for both struct + map).
	clientStore.Lock()
	if client.Subdomain == "" {
		subdomain := newClientID()[:8]
		// Avoid collision on the 8-char prefix.
		for {
			if _, taken := clientStore.subdomains[subdomain]; !taken {
				break
			}
			subdomain = newClientID()[:8]
		}
		client.Subdomain = subdomain
		clientStore.subdomains[client.Subdomain] = clientID
		persistClientLocked(client)
	}
	clientStore.Unlock()

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

func (w *sshConnWrapper) LocalAddr() net.Addr                { return w.conn.LocalAddr() }
func (w *sshConnWrapper) RemoteAddr() net.Addr               { return w.conn.RemoteAddr() }
func (w *sshConnWrapper) SetDeadline(t time.Time) error      { return nil }
func (w *sshConnWrapper) SetReadDeadline(t time.Time) error  { return nil }
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
