package services

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	_ "github.com/jackc/pgx/v5/stdlib"
)

type clientRecord struct {
	ID           string `json:"id"`
	Subdomain    string `json:"subdomain,omitempty"`
	CustomDomain string `json:"customDomain,omitempty"`
	Port         *int   `json:"port"`
}

var clientStore = struct {
	sync.RWMutex
	clients    map[string]*clientRecord
	subdomains map[string]string
	domains    map[string]string
}{clients: make(map[string]*clientRecord), subdomains: make(map[string]string), domains: make(map[string]string)}

var subdomainPattern = regexp.MustCompile(`^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$`)
var reservedSubdomains = map[string]struct{}{"api": {}}

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
	if err := database.Ping(); err != nil {
		_ = database.Close()
		return err
	}
	if _, err := database.Exec(`
		CREATE TABLE IF NOT EXISTS clients (
			id TEXT PRIMARY KEY,
			subdomain TEXT UNIQUE,
			custom_domain TEXT UNIQUE,
			port INTEGER
		)`); err != nil {
		_ = database.Close()
		return err
	}
	rows, err := database.Query("SELECT id, subdomain, custom_domain, port FROM clients")
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
		if err := rows.Scan(&client.ID, &subdomain, &customDomain, &port); err != nil {
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
	return nil
}

func persistLocked() {
	if clientDatabase == nil {
		return
	}
	tx, err := clientDatabase.Begin()
	if err != nil {
		return
	}
	if _, err := tx.Exec("TRUNCATE TABLE clients"); err != nil {
		_ = tx.Rollback()
		return
	}
	for _, client := range clientStore.clients {
		var port any
		if client.Port != nil {
			port = *client.Port
		}
		if _, err := tx.Exec(
			"INSERT INTO clients (id, subdomain, custom_domain, port) VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), $4)",
			client.ID, client.Subdomain, client.CustomDomain, port,
		); err != nil {
			_ = tx.Rollback()
			return
		}
	}
	_ = tx.Commit()
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
	client := &clientRecord{ID: id}
	clientStore.clients[id] = client
	persistLocked()
	c.JSON(http.StatusCreated, client)
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
	persistLocked()
	c.JSON(http.StatusOK, client)
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
	if client.CustomDomain != "" {
		delete(clientStore.domains, client.CustomDomain)
	}
	client.CustomDomain = domain
	clientStore.domains[domain] = input.ClientID
	persistLocked()
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
		if len(label) < 1 || len(label) > 63 || !regexp.MustCompile(`^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$`).MatchString(label) {
			return false
		}
	}
	return strings.Contains(domain, ".")
}

func CheckSubdomain(c *gin.Context) {
	name := strings.ToLower(strings.TrimSpace(c.Query("name")))
	if !subdomainPattern.MatchString(name) || isReservedSubdomain(name) {
		c.JSON(http.StatusOK, gin.H{"available": false})
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
	client, clientFound := clientStore.clients[input.ClientID]
	if !clientFound {
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
	persistLocked()
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
