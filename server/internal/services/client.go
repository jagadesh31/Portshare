package services

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"html"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/jackc/pgx/v5/stdlib"
)

type clientRecord struct {
	ID             string `json:"id"`
	Subdomain      string `json:"subdomain,omitempty"`
	CustomDomain   string `json:"customDomain,omitempty"`
	Port           *int   `json:"port"`
	RequireAuth    bool   `json:"requireAuth"`
	Plan           string `json:"plan"`
	BandwidthUsed  int64  `json:"bandwidthUsed"`
	BandwidthLimit int64  `json:"bandwidthLimit"`
	OwnerEmail     string `json:"ownerEmail,omitempty"`
}

// Bandwidth tiers: guests start at 100 MB, linking a Google account unlocks
// 1 GB free, and Pro raises it to 100 GB.
const (
	anonBandwidthLimit     int64 = 100 * 1024 * 1024
	verifiedBandwidthLimit int64 = 1073741824
	proBandwidthLimit      int64 = 100 * 1024 * 1024 * 1024
)

// TierOf reports the bandwidth tier: "pro", "verified", or "anonymous".
func TierOf(client *clientRecord) string {
	if client == nil {
		return "anonymous"
	}
	if strings.EqualFold(client.Plan, "pro") {
		return "pro"
	}
	if strings.TrimSpace(client.OwnerEmail) != "" {
		return "verified"
	}
	return "anonymous"
}

var clientStore = struct {
	sync.RWMutex
	clients    map[string]*clientRecord
	subdomains map[string]string
	domains    map[string]string
}{clients: make(map[string]*clientRecord), subdomains: make(map[string]string), domains: make(map[string]string)}

var subdomainPattern = regexp.MustCompile(`^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$`)
var customDomainLabelPattern = regexp.MustCompile(`^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$`)

// reservedSubdomains are names PortShare infrastructure owns or may own
// (api.portshare.*, admin.portshare.*, www, ...). Users cannot claim them.
var reservedSubdomains = map[string]struct{}{
	"api": {}, "admin": {}, "administrator": {}, "www": {}, "app": {},
	"dashboard": {}, "console": {}, "panel": {}, "docs": {}, "status": {},
	"blog": {}, "mail": {}, "smtp": {}, "pop": {}, "imap": {}, "ftp": {},
	"sftp": {}, "ssh": {}, "ns1": {}, "ns2": {}, "cdn": {}, "static": {},
	"assets": {}, "auth": {}, "login": {}, "signin": {}, "signup": {},
	"sso": {}, "oauth": {}, "billing": {}, "pay": {}, "payments": {},
	"checkout": {}, "support": {}, "help": {}, "abuse": {}, "security": {},
	"privacy": {}, "terms": {}, "webhook": {}, "webhooks": {}, "metrics": {},
	"monitor": {}, "grafana": {}, "prometheus": {}, "db": {}, "database": {},
	"redis": {}, "postgres": {}, "mysql": {}, "mongo": {}, "vpn": {},
	"proxy": {}, "gateway": {}, "localhost": {}, "portshare": {}, "kexoz": {},
}

var clientDatabase *sql.DB

func LoadClientStore() error {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	database, err := sql.Open("pgx", dsn)
	if err != nil {
		return err
	}
	database.SetMaxOpenConns(25)
	database.SetMaxIdleConns(5)
	database.SetConnMaxLifetime(5 * time.Minute)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := database.PingContext(ctx); err != nil {
		_ = database.Close()
		return err
	}
	if _, err := database.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS clients (
			id TEXT PRIMARY KEY,
			subdomain TEXT UNIQUE,
			custom_domain TEXT UNIQUE,
			port INTEGER,
			require_auth BOOLEAN NOT NULL DEFAULT FALSE,
			plan TEXT NOT NULL DEFAULT 'free',
			bandwidth_used BIGINT NOT NULL DEFAULT 0,
			bandwidth_limit BIGINT NOT NULL DEFAULT 1073741824,
			owner_email TEXT NOT NULL DEFAULT ''
		)`); err != nil {
		_ = database.Close()
		return err
	}
	// Migrate: add column if upgrading from an older schema.
	migrateCtx, migrateCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer migrateCancel()
	_, _ = database.ExecContext(migrateCtx, `ALTER TABLE clients ADD COLUMN IF NOT EXISTS require_auth BOOLEAN NOT NULL DEFAULT FALSE`)
	_, _ = database.ExecContext(migrateCtx, `ALTER TABLE clients ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'`)
	_, _ = database.ExecContext(migrateCtx, `ALTER TABLE clients ADD COLUMN IF NOT EXISTS bandwidth_used BIGINT NOT NULL DEFAULT 0`)
	_, _ = database.ExecContext(migrateCtx, `ALTER TABLE clients ADD COLUMN IF NOT EXISTS bandwidth_limit BIGINT NOT NULL DEFAULT 1073741824`)
	_, _ = database.ExecContext(migrateCtx, `ALTER TABLE clients ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL DEFAULT ''`)
	queryCtx, queryCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer queryCancel()
	rows, err := database.QueryContext(queryCtx, "SELECT id, subdomain, custom_domain, port, require_auth, plan, bandwidth_used, bandwidth_limit, owner_email FROM clients")
	if err != nil {
		_ = database.Close()
		return err
	}
	defer rows.Close()

	loadedClients := make(map[string]*clientRecord)
	loadedSubdomains := make(map[string]string)
	loadedDomains := make(map[string]string)
	for rows.Next() {
		var client clientRecord
		var subdomain, customDomain sql.NullString
		var port sql.NullInt64
		if err := rows.Scan(&client.ID, &subdomain, &customDomain, &port, &client.RequireAuth, &client.Plan, &client.BandwidthUsed, &client.BandwidthLimit, &client.OwnerEmail); err != nil {
			_ = database.Close()
			return err
		}
		if subdomain.Valid {
			client.Subdomain = subdomain.String
			loadedSubdomains[client.Subdomain] = client.ID
		}
		if customDomain.Valid {
			client.CustomDomain = customDomain.String
			loadedDomains[client.CustomDomain] = client.ID
		}
		if port.Valid {
			value := int(port.Int64)
			client.Port = &value
		}
		loadedClients[client.ID] = &client
	}
	if err := rows.Err(); err != nil {
		_ = database.Close()
		return err
	}

	clientStore.Lock()
	clientStore.clients = loadedClients
	clientStore.subdomains = loadedSubdomains
	clientStore.domains = loadedDomains
	clientStore.Unlock()
	clientDatabase = database
	ensureAdminTables(database)
	return nil
}

func persistClientLocked(client *clientRecord) {
	if clientDatabase == nil || client == nil {
		return
	}
	var port any
	if client.Port != nil {
		port = *client.Port
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	// NOTE: bandwidth_used is intentionally NOT updated on conflict — the
	// async flusher (bandwidth.go) owns that counter via deltas. Writing the
	// in-memory absolute value here would double-count queued deltas.
	_, _ = clientDatabase.ExecContext(ctx,
		`INSERT INTO clients (id, subdomain, custom_domain, port, require_auth, plan, bandwidth_used, bandwidth_limit, owner_email)
		 VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), $4, $5, $6, $7, $8, $9)
		 ON CONFLICT (id) DO UPDATE SET
			subdomain = EXCLUDED.subdomain,
			custom_domain = EXCLUDED.custom_domain,
			port = EXCLUDED.port,
			require_auth = EXCLUDED.require_auth,
			plan = EXCLUDED.plan,
			bandwidth_limit = EXCLUDED.bandwidth_limit,
			owner_email = EXCLUDED.owner_email`,
		client.ID, client.Subdomain, client.CustomDomain, port, client.RequireAuth, client.Plan, client.BandwidthUsed, client.BandwidthLimit, client.OwnerEmail,
	)
}

func removeClientMappingsLocked(client *clientRecord) {
	if client == nil {
		return
	}
	if client.Subdomain != "" {
		delete(clientStore.subdomains, client.Subdomain)
	}
	if client.CustomDomain != "" {
		delete(clientStore.domains, client.CustomDomain)
	}
}

func EnsureClientIdentity(c *gin.Context) {
	var input struct {
		ID string `json:"id"`
	}
	_ = c.ShouldBindJSON(&input)
	clientStore.Lock()
	defer clientStore.Unlock()
	if input.ID != "" {
		if client, found := clientStore.clients[input.ID]; found {
			c.JSON(http.StatusOK, client)
			return
		}
	}
	id := newClientID()
	client := &clientRecord{
		ID:             id,
		Plan:           "free",
		BandwidthLimit: anonBandwidthLimit, // 100 MB guest tier; verify with Google for 1 GB
	}
	clientStore.clients[id] = client
	persistClientLocked(client)
	c.JSON(http.StatusCreated, client)
}

// LinkGoogleEmail binds a verified Google email to a client identity.
// First-time verification upgrades guests below the verified tier to 1 GB.
// Returns the client, whether bandwidth was upgraded, and whether found.
func LinkGoogleEmail(clientID, email string) (*clientRecord, bool, bool) {
	email = strings.ToLower(strings.TrimSpace(email))
	if clientID == "" || email == "" {
		return nil, false, false
	}
	clientStore.Lock()
	defer clientStore.Unlock()
	client, found := clientStore.clients[clientID]
	if !found {
		return nil, false, false
	}
	client.OwnerEmail = email
	upgraded := false
	if !strings.EqualFold(client.Plan, "pro") && client.BandwidthLimit < verifiedBandwidthLimit {
		client.BandwidthLimit = verifiedBandwidthLimit
		upgraded = true
	}
	persistClientLocked(client)
	return client, upgraded, true
}

// LinkStatusHandler is polled by the desktop/CLI app while the user completes
// Google sign-in in their browser. clientId is unguessable, so it acts as
// the capability for this endpoint.
func LinkStatusHandler(c *gin.Context) {
	clientID := strings.TrimSpace(c.Query("clientId"))
	if clientID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "clientId is required"})
		return
	}
	clientStore.RLock()
	client, found := clientStore.clients[clientID]
	clientStore.RUnlock()
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"message": "client identity not found"})
		return
	}
	email := strings.TrimSpace(client.OwnerEmail)
	c.JSON(http.StatusOK, gin.H{
		"linked":         email != "",
		"email":          email,
		"plan":           client.Plan,
		"tier":           TierOf(client),
		"bandwidthUsed":  client.BandwidthUsed,
		"bandwidthLimit": client.BandwidthLimit,
	})
}

// LinkFinishHandler completes the browser side of "verify with Google".
// Without a session it bounces through Google login and back here; with a
// session it links the email and shows a success page.
func LinkFinishHandler(c *gin.Context) {
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
	email := IsGAuthSession(c)
	if email == "" {
		scheme := "https"
		if c.Request.TLS == nil && !strings.EqualFold(c.GetHeader("X-Forwarded-Proto"), "https") {
			scheme = "http"
		}
		back := scheme + "://" + c.Request.Host + c.Request.RequestURI
		loginURL := "/auth/google/login?next=" + base64.RawURLEncoding.EncodeToString([]byte(back))
		c.Redirect(http.StatusFound, loginURL)
		c.Abort()
		return
	}
	client, upgraded, ok := LinkGoogleEmail(clientID, email)
	if !ok || client == nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "client identity not found"})
		return
	}
	body := `Signed in as <strong style="color:#e8eaef">` + html.EscapeString(email) + `</strong>.`
	if upgraded {
		body += ` Your free bandwidth was upgraded to <strong style="color:#e8eaef">1&nbsp;GB</strong>.`
	}
	body += ` You can close this window and return to the PortShare app.`
	c.Data(http.StatusOK, "text/html; charset=utf-8", renderPortShareStatusPage(
		"Google linked - PortShare",
		"Verified",
		"Google account linked",
		body,
		"",
		"Open PortShare",
		portShareRootURL(),
	))
}

// RecordBandwidth increments the in-memory counter synchronously (so limit
// checks stay exact) and queues the delta for async DB persistence — it
// never blocks the tunnel hot path on I/O. See bandwidth.go.
func RecordBandwidth(clientID string, bytes int64) {
	queueBandwidth(clientID, bytes)
}

func UpdateClientPort(c *gin.Context) {
	var input struct {
		ClientID string `json:"clientId"`
		Port     int    `json:"port"`
	}
	if err := c.ShouldBindJSON(&input); err != nil || input.Port < 1 || input.Port > 65535 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "clientId and a TCP port from 1 to 65535 are required"})
		return
	}
	clientStore.Lock()
	defer clientStore.Unlock()
	client, found := clientStore.clients[input.ClientID]
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"message": "client identity not found"})
		return
	}
	client.Port = &input.Port
	persistClientLocked(client)
	c.JSON(http.StatusOK, client)
}

// UpdateClientAuth toggles the Google Auth wall for a client's tunnel.
func UpdateClientAuth(c *gin.Context) {
	var input struct {
		ClientID    string `json:"clientId"`
		RequireAuth bool   `json:"requireAuth"`
	}
	if err := c.ShouldBindJSON(&input); err != nil || input.ClientID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "clientId is required"})
		return
	}
	clientStore.Lock()
	defer clientStore.Unlock()
	client, found := clientStore.clients[input.ClientID]
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"message": "client identity not found"})
		return
	}
	if input.RequireAuth && TierOf(client) == "anonymous" {
		c.JSON(http.StatusForbidden, gin.H{"message": "verify with Google to enable the auth wall", "verifyRequired": true})
		return
	}
	client.RequireAuth = input.RequireAuth
	persistClientLocked(client)
	c.JSON(http.StatusOK, gin.H{"requireAuth": client.RequireAuth, "gauthEnabled": GAuthEnabled()})
}

func UpdateClientDomain(c *gin.Context) {
	var input struct {
		ClientID string `json:"clientId"`
		Domain   string `json:"domain"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "clientId and domain are required"})
		return
	}
	domain := strings.ToLower(strings.TrimSpace(input.Domain))
	if !validCustomDomain(domain) {
		c.JSON(http.StatusBadRequest, gin.H{"message": "enter a valid domain such as app.example.com"})
		return
	}
	clientStore.Lock()
	defer clientStore.Unlock()
	client, found := clientStore.clients[input.ClientID]
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"message": "client identity not found"})
		return
	}
	if owner, taken := clientStore.domains[domain]; taken && owner != input.ClientID {
		c.JSON(http.StatusConflict, gin.H{"message": "that domain is already mapped"})
		return
	}
	// Custom domains are a Pro advantage: verified-free and guest tiers
	// keep subdomains + higher bandwidth, domains require Pro.
	if !strings.EqualFold(client.Plan, "pro") {
		c.JSON(http.StatusPaymentRequired, gin.H{"message": "custom domains are a Pro feature — upgrade to map domains", "upgradeRequired": true})
		return
	}
	if client.CustomDomain != "" {
		delete(clientStore.domains, client.CustomDomain)
	}
	client.CustomDomain = domain
	clientStore.domains[domain] = input.ClientID
	persistClientLocked(client)
	c.JSON(http.StatusOK, gin.H{"customDomain": domain, "dnsTarget": "your PortShare public endpoint"})
}

func validCustomDomain(domain string) bool {
	if len(domain) < 4 || len(domain) > 253 || strings.Contains(domain, "..") {
		return false
	}
	parsed, err := url.Parse("https://" + domain)
	if err != nil || parsed.Host != domain || parsed.Hostname() != domain {
		return false
	}
	for _, label := range strings.Split(domain, ".") {
		if len(label) < 1 || len(label) > 63 || !customDomainLabelPattern.MatchString(label) {
			return false
		}
	}
	return strings.Contains(domain, ".")
}

func CheckSubdomain(c *gin.Context) {
	name := strings.ToLower(strings.TrimSpace(c.Query("name")))
	if !subdomainPattern.MatchString(name) {
		c.JSON(http.StatusOK, gin.H{"available": false})
		return
	}
	if isReservedSubdomain(name) {
		c.JSON(http.StatusOK, gin.H{"available": false, "reserved": true})
		return
	}
	clientStore.RLock()
	_, taken := clientStore.subdomains[name]
	clientStore.RUnlock()
	c.JSON(http.StatusOK, gin.H{"available": !taken})
}

func ClaimSubdomain(c *gin.Context) {
	var input struct {
		ClientID  string `json:"clientId"`
		Subdomain string `json:"subdomain"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "clientId and subdomain are required"})
		return
	}
	name := strings.ToLower(strings.TrimSpace(input.Subdomain))
	if !subdomainPattern.MatchString(name) {
		c.JSON(http.StatusBadRequest, gin.H{"message": "subdomain must be 3-32 lowercase letters, numbers, or hyphens"})
		return
	}
	if isReservedSubdomain(name) {
		c.JSON(http.StatusConflict, gin.H{"message": "that subdomain is reserved"})
		return
	}
	clientStore.Lock()
	defer clientStore.Unlock()
	client, found := clientStore.clients[input.ClientID]
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"message": "client identity not found"})
		return
	}
	if owner, taken := clientStore.subdomains[name]; taken && owner != input.ClientID {
		c.JSON(http.StatusConflict, gin.H{"message": "subdomain is already taken"})
		return
	}
	if client.Subdomain != "" {
		delete(clientStore.subdomains, client.Subdomain)
	}
	client.Subdomain = name
	clientStore.subdomains[name] = input.ClientID
	persistClientLocked(client)
	c.JSON(http.StatusOK, client)
}

func isReservedSubdomain(name string) bool {
	_, reserved := reservedSubdomains[name]
	return reserved
}

func newClientID() string {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		panic(err)
	}
	return hex.EncodeToString(bytes)
}
