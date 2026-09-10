package services

// gauth.go — Google OAuth2 wall for tunnel protection.
//
// Flow:
//   1. Visitor hits a protected subdomain.
//   2. HandlePublicTunnel calls RequireGAuth; if no valid session cookie,
//      the visitor is redirected to GET /auth/google/login?next=<original-url>.
//   3. Login handler redirects to Google with a signed state cookie.
//   4. Callback handler validates the state, exchanges the code for a token,
//      fetches the user's email, issues a signed session cookie, and redirects
//      back to the original URL.
//
// All cookies are HMAC-SHA256 signed with SESSION_SECRET so they cannot be
// forged. The feature is entirely disabled if GOOGLE_CLIENT_ID is unset.

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

// ── Config ────────────────────────────────────────────────────────────────────

const (
	gauthSessionCookie = "ps_gauth"   // signed session cookie name
	gauthStateCookie   = "ps_state"   // signed CSRF state cookie name
	gauthSessionTTL    = 12 * time.Hour
	gauthStateTTL      = 10 * time.Minute
)

// gauthConfig returns a populated oauth2.Config or nil when not configured.
func gauthConfig() *oauth2.Config {
	clientID     := strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_ID"))
	clientSecret := strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_SECRET"))
	callbackURL  := strings.TrimSpace(os.Getenv("GOOGLE_OAUTH_CALLBACK_URL"))
	if clientID == "" || clientSecret == "" || callbackURL == "" {
		return nil
	}
	return &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  callbackURL,
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     google.Endpoint,
	}
}

// GAuthEnabled reports whether Google OAuth is configured on this server.
func GAuthEnabled() bool { return gauthConfig() != nil }

// ── HMAC cookie helpers ───────────────────────────────────────────────────────

func sessionSecret() []byte {
	s := os.Getenv("SESSION_SECRET")
	if s == "" {
		// Fallback: derive from GOOGLE_CLIENT_SECRET so a separate var isn't
		// strictly required, though SESSION_SECRET is recommended.
		s = os.Getenv("GOOGLE_CLIENT_SECRET")
	}
	return []byte(s)
}

// signedCookieValue encodes payload as "base64(json)|hmac-hex".
func signedCookieValue(payload any) (string, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	encoded := base64.RawURLEncoding.EncodeToString(data)
	mac := hmac.New(sha256.New, sessionSecret())
	_, _ = mac.Write([]byte(encoded))
	sig := fmt.Sprintf("%x", mac.Sum(nil))
	return encoded + "|" + sig, nil
}

// verifyAndDecodeCookie validates the HMAC signature and unmarshals the payload.
func verifyAndDecodeCookie(raw string, dst any) bool {
	parts := strings.SplitN(raw, "|", 2)
	if len(parts) != 2 {
		return false
	}
	encoded, sig := parts[0], parts[1]
	mac := hmac.New(sha256.New, sessionSecret())
	_, _ = mac.Write([]byte(encoded))
	expected := fmt.Sprintf("%x", mac.Sum(nil))
	if !hmac.Equal([]byte(sig), []byte(expected)) {
		return false
	}
	data, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		return false
	}
	return json.Unmarshal(data, dst) == nil
}

// ── Session payload ───────────────────────────────────────────────────────────

type gauthSession struct {
	Email   string `json:"email"`
	Expires int64  `json:"exp"` // Unix seconds
}

func (s gauthSession) valid() bool {
	return s.Email != "" && time.Now().Unix() < s.Expires
}

// ── State payload (CSRF) ─────────────────────────────────────────────────────

type gauthState struct {
	Nonce   string `json:"n"`
	Next    string `json:"next"`
	Expires int64  `json:"exp"`
}

func (s gauthState) valid(nonce string) bool {
	return s.Nonce == nonce && time.Now().Unix() < s.Expires
}

// ── Public helpers ────────────────────────────────────────────────────────────

// IsGAuthSession returns the authenticated email if the request carries a valid
// Google-auth session cookie, otherwise returns "".
func IsGAuthSession(c *gin.Context) string {
	raw, err := c.Cookie(gauthSessionCookie)
	if err != nil || raw == "" {
		return ""
	}
	var sess gauthSession
	if !verifyAndDecodeCookie(raw, &sess) || !sess.valid() {
		return ""
	}
	return sess.Email
}

// RequireGAuth enforces Google OAuth for requests to auth-protected tunnels.
// Returns true if the request should continue, false if it was redirected.
func RequireGAuth(c *gin.Context, clientID string) bool {
	// Feature guard: if Google OAuth isn't configured, always allow through.
	if !GAuthEnabled() {
		return true
	}
	// Check if this client requires auth.
	clientStore.RLock()
	client, ok := clientStore.clients[clientID]
	var requireAuth bool
	if ok {
		requireAuth = client.RequireAuth
	}
	clientStore.RUnlock()
	if !requireAuth {
		return true
	}
	// Valid session cookie?
	if email := IsGAuthSession(c); email != "" {
		return true
	}
	// No valid session — redirect to login.
	scheme := "https"
	if c.Request.TLS == nil && !strings.EqualFold(c.GetHeader("X-Forwarded-Proto"), "https") {
		scheme = "http"
	}
	originalURL := scheme + "://" + c.Request.Host + c.Request.RequestURI
	loginURL := "/auth/google/login?next=" + base64.RawURLEncoding.EncodeToString([]byte(originalURL))
	c.Redirect(http.StatusFound, loginURL)
	c.Abort()
	return false
}

// ── Handlers ─────────────────────────────────────────────────────────────────

// GoogleLoginHandler initiates the OAuth2 flow.
// GET /auth/google/login?next=<base64-url>
func GoogleLoginHandler(c *gin.Context) {
	cfg := gauthConfig()
	if cfg == nil {
		c.JSON(http.StatusNotImplemented, gin.H{"message": "Google OAuth is not configured on this server"})
		return
	}

	// Generate a random nonce for CSRF protection.
	nonceBytes := make([]byte, 16)
	if _, err := rand.Read(nonceBytes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to generate state"})
		return
	}
	nonce := fmt.Sprintf("%x", nonceBytes)

	nextRaw := strings.TrimSpace(c.Query("next"))
	statePayload := gauthState{
		Nonce:   nonce,
		Next:    nextRaw,
		Expires: time.Now().Add(gauthStateTTL).Unix(),
	}
	stateCookieValue, err := signedCookieValue(statePayload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to sign state"})
		return
	}

	// Store state in a short-lived cookie.
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     gauthStateCookie,
		Value:    stateCookieValue,
		Path:     "/",
		MaxAge:   int(gauthStateTTL.Seconds()),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   c.Request.TLS != nil,
	})

	authURL := cfg.AuthCodeURL(nonce, oauth2.AccessTypeOnline)
	c.Redirect(http.StatusFound, authURL)
}

// GoogleCallbackHandler handles the OAuth2 callback from Google.
// GET /auth/google/callback?state=<nonce>&code=<code>
func GoogleCallbackHandler(c *gin.Context) {
	cfg := gauthConfig()
	if cfg == nil {
		c.JSON(http.StatusNotImplemented, gin.H{"message": "Google OAuth is not configured"})
		return
	}

	// Validate CSRF state.
	rawState, err := c.Cookie(gauthStateCookie)
	if err != nil || rawState == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "missing or expired state cookie"})
		return
	}
	var statePayload gauthState
	if !verifyAndDecodeCookie(rawState, &statePayload) {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid state cookie"})
		return
	}
	if !statePayload.valid(c.Query("state")) {
		c.JSON(http.StatusBadRequest, gin.H{"message": "state mismatch or expired"})
		return
	}

	// Exchange code for token.
	token, err := cfg.Exchange(c.Request.Context(), c.Query("code"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "OAuth2 token exchange failed: " + err.Error()})
		return
	}

	// Fetch user email from Google's userinfo endpoint.
	client := cfg.Client(c.Request.Context(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v3/userinfo")
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"message": "failed to fetch user info"})
		return
	}
	defer resp.Body.Close()
	rawBody, err := io.ReadAll(io.LimitReader(resp.Body, 16<<10))
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"message": "failed to read user info"})
		return
	}
	var userInfo struct {
		Email         string `json:"email"`
		EmailVerified bool   `json:"email_verified"`
	}
	if err := json.Unmarshal(rawBody, &userInfo); err != nil || userInfo.Email == "" {
		c.JSON(http.StatusBadGateway, gin.H{"message": "invalid user info response"})
		return
	}
	if !userInfo.EmailVerified {
		c.JSON(http.StatusForbidden, gin.H{"message": "Google account email is not verified"})
		return
	}

	// Issue session cookie.
	session := gauthSession{
		Email:   userInfo.Email,
		Expires: time.Now().Add(gauthSessionTTL).Unix(),
	}
	sessionValue, err := signedCookieValue(session)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to create session"})
		return
	}
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     gauthSessionCookie,
		Value:    sessionValue,
		Path:     "/",
		MaxAge:   int(gauthSessionTTL.Seconds()),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   c.Request.TLS != nil,
	})

	// Clear the state cookie.
	http.SetCookie(c.Writer, &http.Cookie{
		Name:    gauthStateCookie,
		Value:   "",
		Path:    "/",
		MaxAge:  -1,
		Expires: time.Unix(0, 0),
	})

	// Redirect back to the original URL.
	next := "/"
	if statePayload.Next != "" {
		decoded, err := base64.RawURLEncoding.DecodeString(statePayload.Next)
		if err == nil && len(decoded) > 0 {
			next = string(decoded)
		}
	}
	c.Redirect(http.StatusFound, next)
}

// GoogleLogoutHandler clears the session cookie.
// GET /auth/google/logout
func GoogleLogoutHandler(c *gin.Context) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:    gauthSessionCookie,
		Value:   "",
		Path:    "/",
		MaxAge:  -1,
		Expires: time.Unix(0, 0),
	})
	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}

// GAuthStatusHandler reports whether GAuth is enabled and current session info.
// GET /auth/google/status
func GAuthStatusHandler(c *gin.Context) {
	email := IsGAuthSession(c)
	c.JSON(http.StatusOK, gin.H{
		"enabled":       GAuthEnabled(),
		"authenticated": email != "",
		"email":         email,
	})
}
