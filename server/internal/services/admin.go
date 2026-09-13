package services

// admin.go — admin panel backend for admin.portshare.kexoz.dev.
//
// Provides:
//   - Admin auth gate: Google OAuth session email must be in ADMIN_EMAILS.
//   - Plans CRUD (prices, bandwidth, features, per-plan discount %).
//   - Discount coupons CRUD + public validation.
//   - Extended stats: users, paid users, conversion rate, traffic,
//     human vs bot viewer counts (User-Agent based) with 14-day history.
//
// Viewer counting: RecordViewer is called from HandlePublicTunnel for every
// hit on a claimed host. Bot detection is User-Agent based. Counts are kept
// in memory and flushed to viewer_daily every minute.

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// ── Admin auth ────────────────────────────────────────────────────────────────

func adminEmails() []string {
	raw := strings.TrimSpace(os.Getenv("ADMIN_EMAILS"))
	if raw == "" {
		return nil
	}
	var out []string
	for _, part := range strings.Split(raw, ",") {
		if email := strings.ToLower(strings.TrimSpace(part)); email != "" {
			out = append(out, email)
		}
	}
	return out
}

// IsAdminEmail reports whether email is in the ADMIN_EMAILS allowlist.
func IsAdminEmail(email string) bool {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return false
	}
	for _, allowed := range adminEmails() {
		if allowed == email {
			return true
		}
	}
	return false
}

// RequireAdmin is Gin middleware: requires a Google session whose email is
// in ADMIN_EMAILS. Returns 401 when logged out, 403 when not an admin.
func RequireAdmin(c *gin.Context) {
	email := IsGAuthSession(c)
	if email == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "admin login required"})
		c.Abort()
		return
	}
	if !IsAdminEmail(email) {
		c.JSON(http.StatusForbidden, gin.H{"message": "not authorized"})
		c.Abort()
		return
	}
	c.Set("adminEmail", email)
	c.Next()
}

// AdminMe reports the current session + admin status for the admin frontend.
func AdminMe(c *gin.Context) {
	email := IsGAuthSession(c)
	c.JSON(http.StatusOK, gin.H{
		"enabled": GAuthEnabled(),
		"email":   email,
		"isAdmin": IsAdminEmail(email),
	})
}

// ── Plans ─────────────────────────────────────────────────────────────────────

type Plan struct {
	ID              string   `json:"id"`
	Name            string   `json:"name"`
	PriceCents      int64    `json:"priceCents"`
	Currency        string   `json:"currency"`
	BandwidthLimit  int64    `json:"bandwidthLimit"`
	Features        []string `json:"features"`
	Active          bool     `json:"active"`
	DiscountPercent int      `json:"discountPercent"`
}

func ensureAdminTables(database *sql.DB) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	_, _ = database.ExecContext(ctx, `ALTER TABLE clients ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()`)
	_, _ = database.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS plans (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			price_cents BIGINT NOT NULL DEFAULT 0,
			currency TEXT NOT NULL DEFAULT 'USD',
			bandwidth_limit BIGINT NOT NULL DEFAULT 1073741824,
			features TEXT NOT NULL DEFAULT '[]',
			active BOOLEAN NOT NULL DEFAULT TRUE,
			discount_percent INTEGER NOT NULL DEFAULT 0,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)`)
	_, _ = database.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS coupons (
			code TEXT PRIMARY KEY,
			percent_off INTEGER NOT NULL DEFAULT 0,
			amount_off_cents BIGINT NOT NULL DEFAULT 0,
			max_redemptions INTEGER NOT NULL DEFAULT 0,
			redeemed_count INTEGER NOT NULL DEFAULT 0,
			active BOOLEAN NOT NULL DEFAULT TRUE,
			expires_at TIMESTAMPTZ,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)`)
	_, _ = database.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS viewer_daily (
			day DATE PRIMARY KEY,
			human BIGINT NOT NULL DEFAULT 0,
			bot BIGINT NOT NULL DEFAULT 0
		)`)
	// Seed default plans (idempotent).
	_, _ = database.ExecContext(ctx, `
		INSERT INTO plans (id, name, price_cents, currency, bandwidth_limit, features, active, discount_percent)
		VALUES
			('hobby', 'Hobby', 0, 'USD', 1073741824, '["1 GB / month","Permanent subdomain","Request inspector"]', TRUE, 0),
			('pro', 'Pro', 1200, 'USD', 107374182400, '["100 GB / month","Custom domains","Google auth wall"]', TRUE, 0)
		ON CONFLICT (id) DO NOTHING`)
}

func scanPlanRow(row interface {
	Scan(dest ...any) error
}) (Plan, error) {
	var p Plan
	var featuresRaw string
	var updatedAt time.Time
	if err := row.Scan(&p.ID, &p.Name, &p.PriceCents, &p.Currency, &p.BandwidthLimit, &featuresRaw, &p.Active, &p.DiscountPercent, &updatedAt); err != nil {
		return p, err
	}
	_ = json.Unmarshal([]byte(featuresRaw), &p.Features)
	if p.Features == nil {
		p.Features = []string{}
	}
	return p, nil
}

func listPlans() ([]Plan, error) {
	if clientDatabase == nil {
		return []Plan{}, nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	rows, err := clientDatabase.QueryContext(ctx, `SELECT id, name, price_cents, currency, bandwidth_limit, features, active, discount_percent, updated_at FROM plans ORDER BY price_cents ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	plans := []Plan{}
	for rows.Next() {
		p, err := scanPlanRow(rows)
		if err != nil {
			return nil, err
		}
		plans = append(plans, p)
	}
	return plans, rows.Err()
}

// ListPlans is public — the pricing page and checkout read from here.
func ListPlans(c *gin.Context) {
	plans, err := listPlans()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load plans"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"plans": plans})
}

// UpsertPlan creates or updates a plan (admin only).
func UpsertPlan(c *gin.Context) {
	var input struct {
		ID              string   `json:"id"`
		Name            string   `json:"name"`
		PriceCents      int64    `json:"priceCents"`
		Currency        string   `json:"currency"`
		BandwidthLimit  int64    `json:"bandwidthLimit"`
		Features        []string `json:"features"`
		Active          *bool    `json:"active"`
		DiscountPercent int      `json:"discountPercent"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid plan payload"})
		return
	}
	input.ID = strings.ToLower(strings.TrimSpace(input.ID))
	input.Name = strings.TrimSpace(input.Name)
	if input.ID == "" || input.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "plan id and name are required"})
		return
	}
	if input.PriceCents < 0 || input.BandwidthLimit < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "price and bandwidth must be >= 0"})
		return
	}
	if input.DiscountPercent < 0 || input.DiscountPercent > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "discount must be between 0 and 100"})
		return
	}
	if input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency)); input.Currency == "" {
		input.Currency = "USD"
	}
	active := true
	if input.Active != nil {
		active = *input.Active
	}
	featuresRaw, _ := json.Marshal(input.Features)
	if clientDatabase == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"message": "database unavailable"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := clientDatabase.ExecContext(ctx, `
		INSERT INTO plans (id, name, price_cents, currency, bandwidth_limit, features, active, discount_percent, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			price_cents = EXCLUDED.price_cents,
			currency = EXCLUDED.currency,
			bandwidth_limit = EXCLUDED.bandwidth_limit,
			features = EXCLUDED.features,
			active = EXCLUDED.active,
			discount_percent = EXCLUDED.discount_percent,
			updated_at = now()`,
		input.ID, input.Name, input.PriceCents, input.Currency, input.BandwidthLimit, string(featuresRaw), active, input.DiscountPercent,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to save plan"})
		return
	}
	plans, _ := listPlans()
	c.JSON(http.StatusOK, gin.H{"plans": plans})
}

// DeletePlan removes a plan (admin only). The free/hobby plan is protected.
func DeletePlan(c *gin.Context) {
	id := strings.ToLower(strings.TrimSpace(c.Param("id")))
	if id == "" || id == "hobby" || id == "free" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "that plan cannot be deleted"})
		return
	}
	if clientDatabase == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"message": "database unavailable"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := clientDatabase.ExecContext(ctx, `DELETE FROM plans WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to delete plan"})
		return
	}
	plans, _ := listPlans()
	c.JSON(http.StatusOK, gin.H{"plans": plans})
}

// planPriceAfterDiscount returns price_cents after the plan's own discount %.
func planPriceAfterDiscount(p Plan) int64 {
	if p.DiscountPercent <= 0 {
		return p.PriceCents
	}
	discounted := p.PriceCents * int64(100-p.DiscountPercent) / 100
	if discounted < 0 {
		return 0
	}
	return discounted
}

// ── Coupons ───────────────────────────────────────────────────────────────────

type Coupon struct {
	Code           string     `json:"code"`
	PercentOff     int        `json:"percentOff"`
	AmountOffCents int64      `json:"amountOffCents"`
	MaxRedemptions int        `json:"maxRedemptions"`
	RedeemedCount  int        `json:"redeemedCount"`
	Active         bool       `json:"active"`
	ExpiresAt      *time.Time `json:"expiresAt,omitempty"`
}

func listCoupons() ([]Coupon, error) {
	if clientDatabase == nil {
		return []Coupon{}, nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	rows, err := clientDatabase.QueryContext(ctx, `SELECT code, percent_off, amount_off_cents, max_redemptions, redeemed_count, active, expires_at FROM coupons ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	coupons := []Coupon{}
	for rows.Next() {
		var cp Coupon
		var expires sql.NullTime
		if err := rows.Scan(&cp.Code, &cp.PercentOff, &cp.AmountOffCents, &cp.MaxRedemptions, &cp.RedeemedCount, &cp.Active, &expires); err != nil {
			return nil, err
		}
		if expires.Valid {
			t := expires.Time
			cp.ExpiresAt = &t
		}
		coupons = append(coupons, cp)
	}
	return coupons, rows.Err()
}

func getCoupon(code string) (Coupon, bool) {
	var cp Coupon
	if clientDatabase == nil {
		return cp, false
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var expires sql.NullTime
	err := clientDatabase.QueryRowContext(ctx, `SELECT code, percent_off, amount_off_cents, max_redemptions, redeemed_count, active, expires_at FROM coupons WHERE code = $1`,
		strings.ToUpper(strings.TrimSpace(code)),
	).Scan(&cp.Code, &cp.PercentOff, &cp.AmountOffCents, &cp.MaxRedemptions, &cp.RedeemedCount, &cp.Active, &expires)
	if err != nil {
		return cp, false
	}
	if expires.Valid {
		t := expires.Time
		cp.ExpiresAt = &t
	}
	return cp, true
}

func couponUsable(cp Coupon) bool {
	if !cp.Active {
		return false
	}
	if cp.ExpiresAt != nil && time.Now().After(*cp.ExpiresAt) {
		return false
	}
	if cp.MaxRedemptions > 0 && cp.RedeemedCount >= cp.MaxRedemptions {
		return false
	}
	return true
}

// applyCoupon returns the amount after applying cp to base (both in cents).
func applyCoupon(base int64, cp Coupon) int64 {
	amount := base
	if cp.PercentOff > 0 {
		amount = amount * int64(100-min(cp.PercentOff, 100)) / 100
	}
	amount -= cp.AmountOffCents
	if amount < 0 {
		amount = 0
	}
	return amount
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// ListCoupons (admin only).
func ListCoupons(c *gin.Context) {
	coupons, err := listCoupons()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to load coupons"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"coupons": coupons})
}

// UpsertCoupon creates or updates a coupon (admin only).
func UpsertCoupon(c *gin.Context) {
	var input struct {
		Code           string `json:"code"`
		PercentOff     int    `json:"percentOff"`
		AmountOffCents int64  `json:"amountOffCents"`
		MaxRedemptions int    `json:"maxRedemptions"`
		Active         *bool  `json:"active"`
		ExpiresAt      string `json:"expiresAt"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid coupon payload"})
		return
	}
	code := strings.ToUpper(strings.TrimSpace(input.Code))
	if code == "" || len(code) > 32 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "coupon code is required (max 32 chars)"})
		return
	}
	if input.PercentOff < 0 || input.PercentOff > 100 || input.AmountOffCents < 0 || input.MaxRedemptions < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid discount values"})
		return
	}
	if input.PercentOff == 0 && input.AmountOffCents == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "coupon must give a percent or amount discount"})
		return
	}
	active := true
	if input.Active != nil {
		active = *input.Active
	}
	var expires any
	if strings.TrimSpace(input.ExpiresAt) != "" {
		t, err := time.Parse(time.RFC3339, strings.TrimSpace(input.ExpiresAt))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "expiresAt must be RFC3339 (e.g. 2026-12-31T23:59:00Z)"})
			return
		}
		expires = t
	}
	if clientDatabase == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"message": "database unavailable"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := clientDatabase.ExecContext(ctx, `
		INSERT INTO coupons (code, percent_off, amount_off_cents, max_redemptions, active, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (code) DO UPDATE SET
			percent_off = EXCLUDED.percent_off,
			amount_off_cents = EXCLUDED.amount_off_cents,
			max_redemptions = EXCLUDED.max_redemptions,
			active = EXCLUDED.active,
			expires_at = EXCLUDED.expires_at`,
		code, input.PercentOff, input.AmountOffCents, input.MaxRedemptions, active, expires,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to save coupon"})
		return
	}
	coupons, _ := listCoupons()
	c.JSON(http.StatusOK, gin.H{"coupons": coupons})
}

// DeleteCoupon removes a coupon (admin only).
func DeleteCoupon(c *gin.Context) {
	code := strings.ToUpper(strings.TrimSpace(c.Param("code")))
	if code == "" || clientDatabase == nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "coupon code is required"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := clientDatabase.ExecContext(ctx, `DELETE FROM coupons WHERE code = $1`, code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to delete coupon"})
		return
	}
	coupons, _ := listCoupons()
	c.JSON(http.StatusOK, gin.H{"coupons": coupons})
}

// ValidateCoupon is public — checkout uses it to preview discounts.
func ValidateCoupon(c *gin.Context) {
	code := strings.TrimSpace(c.Query("code"))
	planID := strings.ToLower(strings.TrimSpace(c.Query("planId")))
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "code is required"})
		return
	}
	cp, found := getCoupon(code)
	if !found || !couponUsable(cp) {
		c.JSON(http.StatusOK, gin.H{"valid": false})
		return
	}
	resp := gin.H{"valid": true, "percentOff": cp.PercentOff, "amountOffCents": cp.AmountOffCents}
	if planID != "" {
		if plans, err := listPlans(); err == nil {
			for _, p := range plans {
				if p.ID == planID {
					base := planPriceAfterDiscount(p)
					resp["baseCents"] = base
					resp["finalCents"] = applyCoupon(base, cp)
					resp["currency"] = p.Currency
					break
				}
			}
		}
	}
	c.JSON(http.StatusOK, resp)
}

// ── Viewer stats (human vs bot) ───────────────────────────────────────────────

var botUATokens = []string{
	"bot", "crawl", "spider", "slurp", "mediapartners", "baidu", "yandex",
	"sogou", "exabot", "facebot", "ia_archiver", "gptbot", "chatgpt-user",
	"ccbot", "anthropic", "claudebot", "applebot", "semrush", "ahrefs",
	"mj12", "dotbot", "petal", "bytespider", "facebookexternalhit",
	"twitterbot", "linkedinbot", "embedly", "quora", "outbrain",
}

// IsBotUA reports whether a User-Agent looks like a bot/crawler.
func IsBotUA(ua string) bool {
	lowered := strings.ToLower(ua)
	if lowered == "" {
		return false
	}
	for _, token := range botUATokens {
		if strings.Contains(lowered, token) {
			return true
		}
	}
	return false
}

var viewerCounters = struct {
	sync.Mutex
	pendingHuman int64
	pendingBot   int64
	byDay        map[string]*dayView
}{byDay: make(map[string]*dayView)}

type dayView struct {
	Day   string `json:"day"`
	Human int64  `json:"human"`
	Bot   int64  `json:"bot"`
}

func init() {
	go flushViewerCounters()
}

// RecordViewer counts one view on a claimed tunnel host.
func RecordViewer(userAgent string) {
	viewerCounters.Lock()
	if IsBotUA(userAgent) {
		viewerCounters.pendingBot++
	} else {
		viewerCounters.pendingHuman++
	}
	viewerCounters.Unlock()
}

func flushViewerCounters() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		viewerCounters.Lock()
		human, bot := viewerCounters.pendingHuman, viewerCounters.pendingBot
		viewerCounters.pendingHuman, viewerCounters.pendingBot = 0, 0
		viewerCounters.Unlock()
		if human == 0 && bot == 0 {
			continue
		}
		if clientDatabase == nil {
			continue
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		_, _ = clientDatabase.ExecContext(ctx, `
			INSERT INTO viewer_daily (day, human, bot) VALUES (CURRENT_DATE, $1, $2)
			ON CONFLICT (day) DO UPDATE SET human = viewer_daily.human + $1, bot = viewer_daily.bot + $2`,
			human, bot,
		)
		cancel()
	}
}

type viewerTotals struct {
	human int64
	bot   int64
	byDay []dayView
}

func loadViewerTotals() viewerTotals {
	var totals viewerTotals
	totals.byDay = []dayView{}
	if clientDatabase == nil {
		return totals
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = clientDatabase.QueryRowContext(ctx, `SELECT COALESCE(SUM(human),0), COALESCE(SUM(bot),0) FROM viewer_daily`).Scan(&totals.human, &totals.bot)
	rows, err := clientDatabase.QueryContext(ctx, `SELECT day::TEXT, human, bot FROM viewer_daily ORDER BY day DESC LIMIT 14`)
	if err != nil {
		return totals
	}
	defer rows.Close()
	for rows.Next() {
		var d dayView
		if err := rows.Scan(&d.Day, &d.Human, &d.Bot); err == nil {
			totals.byDay = append(totals.byDay, d)
		}
	}
	// Oldest-first for charts.
	for i, j := 0, len(totals.byDay)-1; i < j; i, j = i+1, j-1 {
		totals.byDay[i], totals.byDay[j] = totals.byDay[j], totals.byDay[i]
	}
	// Include not-yet-flushed in-memory counts in today's bucket.
	viewerCounters.Lock()
	ph, pb := viewerCounters.pendingHuman, viewerCounters.pendingBot
	viewerCounters.Unlock()
	totals.human += ph
	totals.bot += pb
	if len(totals.byDay) > 0 {
		today := time.Now().Format("2006-01-02")
		if totals.byDay[len(totals.byDay)-1].Day == today {
			totals.byDay[len(totals.byDay)-1].Human += ph
			totals.byDay[len(totals.byDay)-1].Bot += pb
		} else {
			totals.byDay = append(totals.byDay, dayView{Day: today, Human: ph, Bot: pb})
		}
	} else if ph+pb > 0 {
		totals.byDay = append(totals.byDay, dayView{Day: time.Now().Format("2006-01-02"), Human: ph, Bot: pb})
	}
	return totals
}

// ── Overview ──────────────────────────────────────────────────────────────────

type recentUser struct {
	ID        string `json:"id"`
	Subdomain string `json:"subdomain,omitempty"`
	Plan      string `json:"plan"`
	CreatedAt string `json:"createdAt"`
}

// AdminOverview returns every stat the admin dashboard needs in one call.
func AdminOverview(c *gin.Context) {
	tunnelStore.RLock()
	activeTunnels := len(tunnelStore.connections)
	tunnelStore.RUnlock()
	sshStore.RLock()
	activeTunnels += len(sshStore.connections)
	sshStore.RUnlock()

	statsStore.RLock()
	var totalRequests, bytesIn, bytesOut int64
	for _, s := range statsStore.data {
		totalRequests += s.TotalRequests
		bytesIn += s.BytesIn
		bytesOut += s.BytesOut
	}
	statsStore.RUnlock()

	clientStore.RLock()
	totalUsers := len(clientStore.clients)
	paidUsers := 0
	verifiedUsers := 0
	for _, client := range clientStore.clients {
		if strings.EqualFold(client.Plan, "pro") {
			paidUsers++
		}
		if strings.TrimSpace(client.OwnerEmail) != "" {
			verifiedUsers++
		}
	}
	clientStore.RUnlock()

	conversion := 0.0
	if totalUsers > 0 {
		conversion = float64(paidUsers) / float64(totalUsers) * 100
	}

	viewers := loadViewerTotals()
	plans, _ := listPlans()
	coupons, _ := listCoupons()

	recent := []recentUser{}
	if clientDatabase != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		rows, err := clientDatabase.QueryContext(ctx, `SELECT id, COALESCE(subdomain,''), plan, created_at FROM clients ORDER BY created_at DESC LIMIT 20`)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var u recentUser
				var created time.Time
				if err := rows.Scan(&u.ID, &u.Subdomain, &u.Plan, &created); err == nil {
					u.CreatedAt = created.Format(time.RFC3339)
					recent = append(recent, u)
				}
			}
		}
		cancel()
	}

	c.JSON(http.StatusOK, gin.H{
		"users": gin.H{
			"total":          totalUsers,
			"paid":           paidUsers,
			"free":           totalUsers - paidUsers,
			"verified":       verifiedUsers,
			"anonymous":      totalUsers - verifiedUsers,
			"conversionRate": conversion,
		},
		"tunnels": gin.H{"active": activeTunnels},
		"traffic": gin.H{
			"totalRequests": totalRequests,
			"bytesIn":       bytesIn,
			"bytesOut":      bytesOut,
		},
		"viewers": gin.H{
			"human": viewers.human,
			"bot":   viewers.bot,
			"total": viewers.human + viewers.bot,
			"byDay": viewers.byDay,
		},
		"plans":       plans,
		"coupons":     coupons,
		"recentUsers": recent,
	})
}
