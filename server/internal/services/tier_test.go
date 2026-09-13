package services

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func resetClientStore(t *testing.T, clients map[string]*clientRecord) {
	t.Helper()
	clientStore.Lock()
	originalClients := clientStore.clients
	originalSubdomains := clientStore.subdomains
	originalDomains := clientStore.domains
	clientStore.clients = clients
	subdomains := make(map[string]string)
	domains := make(map[string]string)
	for id, c := range clients {
		if c.Subdomain != "" {
			subdomains[c.Subdomain] = id
		}
		if c.CustomDomain != "" {
			domains[strings.ToLower(c.CustomDomain)] = id
		}
	}
	clientStore.subdomains = subdomains
	clientStore.domains = domains
	clientStore.Unlock()
	bwPending.Lock()
	originalPending := bwPending.deltas
	bwPending.deltas = make(map[string]int64)
	bwPending.Unlock()
	t.Cleanup(func() {
		clientStore.Lock()
		clientStore.clients = originalClients
		clientStore.subdomains = originalSubdomains
		clientStore.domains = originalDomains
		clientStore.Unlock()
		bwPending.Lock()
		bwPending.deltas = originalPending
		bwPending.Unlock()
	})
}

func ginTestContext(method, body string) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(method, "/", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	return c, w
}

func TestTierOf(t *testing.T) {
	cases := []struct {
		name   string
		client *clientRecord
		want   string
	}{
		{"nil", nil, "anonymous"},
		{"guest", &clientRecord{ID: "a", Plan: "free", BandwidthLimit: anonBandwidthLimit}, "anonymous"},
		{"verified", &clientRecord{ID: "b", Plan: "free", OwnerEmail: "user@gmail.com"}, "verified"},
		{"pro", &clientRecord{ID: "c", Plan: "pro"}, "pro"},
		{"pro case-insensitive", &clientRecord{ID: "d", Plan: "PRO", OwnerEmail: ""}, "pro"},
		{"pro beats anonymous email check", &clientRecord{ID: "e", Plan: "pro", OwnerEmail: "x@y.z"}, "pro"},
	}
	for _, tc := range cases {
		if got := TierOf(tc.client); got != tc.want {
			t.Errorf("TierOf(%s) = %q, want %q", tc.name, got, tc.want)
		}
	}
}

func TestLinkGoogleEmailUpgradesGuest(t *testing.T) {
	resetClientStore(t, map[string]*clientRecord{
		"guest": {ID: "guest", Plan: "free", BandwidthLimit: anonBandwidthLimit},
	})
	client, upgraded, ok := LinkGoogleEmail("guest", "User@Gmail.com")
	if !ok || client == nil {
		t.Fatal("expected link to succeed")
	}
	if !upgraded {
		t.Error("expected bandwidth upgrade on first verification")
	}
	if client.OwnerEmail != "user@gmail.com" {
		t.Errorf("email not normalized, got %q", client.OwnerEmail)
	}
	if client.BandwidthLimit != verifiedBandwidthLimit {
		t.Errorf("limit = %d, want %d", client.BandwidthLimit, verifiedBandwidthLimit)
	}
	if TierOf(client) != "verified" {
		t.Errorf("tier = %q, want verified", TierOf(client))
	}
}

func TestLinkGoogleEmailUnknownClient(t *testing.T) {
	resetClientStore(t, map[string]*clientRecord{})
	if _, _, ok := LinkGoogleEmail("nope", "a@b.c"); ok {
		t.Error("expected not-found for unknown client")
	}
	if _, _, ok := LinkGoogleEmail("", "a@b.c"); ok {
		t.Error("expected failure for empty client id")
	}
	if _, _, ok := LinkGoogleEmail("x", ""); ok {
		t.Error("expected failure for empty email")
	}
}

func TestLinkGoogleEmailNeverDowngrades(t *testing.T) {
	resetClientStore(t, map[string]*clientRecord{
		"pro":      {ID: "pro", Plan: "pro", BandwidthLimit: proBandwidthLimit},
		"big-free": {ID: "big-free", Plan: "free", BandwidthLimit: 5 * verifiedBandwidthLimit},
	})
	pro, upgraded, ok := LinkGoogleEmail("pro", "pro@x.dev")
	if !ok || upgraded {
		t.Error("pro must link without any bandwidth change")
	}
	if pro.BandwidthLimit != proBandwidthLimit || TierOf(pro) != "pro" {
		t.Error("pro record mutated by link")
	}
	big, upgraded, ok := LinkGoogleEmail("big-free", "big@x.dev")
	if !ok || upgraded {
		t.Error("already-generous free tier must not be downgraded")
	}
	if big.BandwidthLimit != 5*verifiedBandwidthLimit {
		t.Errorf("limit changed to %d", big.BandwidthLimit)
	}

	// Relink is idempotent and not an upgrade.
	if _, upgraded, _ := LinkGoogleEmail("big-free", "big@x.dev"); upgraded {
		t.Error("relink must not report an upgrade")
	}
}

func TestRecordBandwidthIsMemoryExact(t *testing.T) {
	resetClientStore(t, map[string]*clientRecord{
		"u": {ID: "u", Plan: "free", BandwidthLimit: anonBandwidthLimit},
	})
	RecordBandwidth("u", 100)
	RecordBandwidth("u", 50)
	RecordBandwidth("unknown", 10) // must not panic
	clientStore.RLock()
	got := clientStore.clients["u"].BandwidthUsed
	clientStore.RUnlock()
	if got != 150 {
		t.Errorf("in-memory bandwidth = %d, want 150", got)
	}
	bwPending.Lock()
	pending := bwPending.deltas["u"]
	bwPending.Unlock()
	if pending != 150 {
		t.Errorf("queued delta = %d, want 150", pending)
	}
}

func TestUpdateClientDomainRequiresPro(t *testing.T) {
	resetClientStore(t, map[string]*clientRecord{
		"free": {ID: "free", Plan: "free", BandwidthLimit: verifiedBandwidthLimit},
		"pro":  {ID: "pro", Plan: "pro", BandwidthLimit: proBandwidthLimit},
	})
	c, w := ginTestContext(http.MethodPut, `{"clientId":"free","domain":"app.example.com"}`)
	UpdateClientDomain(c)
	if w.Code != http.StatusPaymentRequired {
		t.Errorf("free domain mapping status = %d, want 402", w.Code)
	}
	if !strings.Contains(w.Body.String(), "upgrade") {
		t.Errorf("402 body should mention upgrade, got %q", w.Body.String())
	}

	c, w = ginTestContext(http.MethodPut, `{"clientId":"pro","domain":"app.example.com"}`)
	UpdateClientDomain(c)
	if w.Code != http.StatusOK {
		t.Errorf("pro domain mapping status = %d, want 200", w.Code)
	}
}

func TestUpdateClientAuthRequiresVerification(t *testing.T) {
	resetClientStore(t, map[string]*clientRecord{
		"anon":     {ID: "anon", Plan: "free", BandwidthLimit: anonBandwidthLimit},
		"verified": {ID: "verified", Plan: "free", OwnerEmail: "v@x.dev", BandwidthLimit: verifiedBandwidthLimit},
	})
	// Anonymous enabling the wall is rejected.
	c, w := ginTestContext(http.MethodPut, `{"clientId":"anon","requireAuth":true}`)
	UpdateClientAuth(c)
	if w.Code != http.StatusForbidden {
		t.Errorf("anon enable status = %d, want 403", w.Code)
	}
	// Anonymous disabling is always fine (no-op safe).
	c, w = ginTestContext(http.MethodPut, `{"clientId":"anon","requireAuth":false}`)
	UpdateClientAuth(c)
	if w.Code != http.StatusOK {
		t.Errorf("anon disable status = %d, want 200", w.Code)
	}
	// Verified users can toggle.
	c, w = ginTestContext(http.MethodPut, `{"clientId":"verified","requireAuth":true}`)
	UpdateClientAuth(c)
	if w.Code != http.StatusOK {
		t.Errorf("verified enable status = %d, want 200", w.Code)
	}
	clientStore.RLock()
	enabled := clientStore.clients["verified"].RequireAuth
	clientStore.RUnlock()
	if !enabled {
		t.Error("verified requireAuth was not persisted in memory")
	}
}

func TestIsBotUA(t *testing.T) {
	if !IsBotUA("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)") {
		t.Error("googlebot not detected")
	}
	if !IsBotUA("GPTBot/1.0") {
		t.Error("gptbot not detected")
	}
	if IsBotUA("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36") {
		t.Error("regular browser misclassified as bot")
	}
	if IsBotUA("") {
		t.Error("empty UA misclassified as bot")
	}
}

func TestClientForHostCustomDomainIndex(t *testing.T) {
	t.Setenv("PORTSHARE_ROOT_DOMAIN", "example.test")
	resetClientStore(t, map[string]*clientRecord{
		"u1": {ID: "u1", Subdomain: "demo", CustomDomain: "app.example.com"},
	})
	if got := clientForHost("app.example.com"); got != "u1" {
		t.Errorf("custom domain lookup = %q, want u1", got)
	}
	if got := clientForHost("APP.EXAMPLE.COM:443"); got != "u1" {
		t.Errorf("case/port handling = %q, want u1", got)
	}
	if got := clientForHost("demo.example.test"); got != "u1" {
		t.Errorf("subdomain lookup = %q, want u1", got)
	}
	if got := clientForHost("unknown.example.test"); got != "" {
		t.Errorf("unknown host = %q, want empty", got)
	}
}
