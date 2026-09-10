"use client";

import { Check } from "lucide-react";
import { useState } from "react";

export default function PricingPage() {
  const [clientId, setClientId] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("");

  const handleCheckout = async () => {
    if (!clientId.trim()) {
      setMessage("Please enter your Client ID from the desktop app.");
      return;
    }
    setIsBusy(true);
    setMessage("");
    try {
      // Mock API call to our backend checkout session
      // In production, this would redirect to a real Stripe Checkout Session URL
      const baseUrl = process.env.NEXT_PUBLIC_PORTSHARE_API_BASE || "http://localhost:9080";
      const res = await fetch(`${baseUrl}/client/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: clientId.trim() })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Checkout failed");
      }
      
      const data = await res.json();
      setMessage("Redirecting to secure checkout...");
      
      // Simulate Stripe redirect by going to a mock success page after delay
      setTimeout(async () => {
        // Trigger the mock webhook to simulate successful payment
        await fetch(`${baseUrl}/client/billing/mock-webhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: clientId.trim() })
        });
        setMessage("Payment successful! Your account is now Pro. You can close this window.");
      }, 1500);
      
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="landing-wrap">
      <main className="landing-main" style={{ paddingTop: "80px" }}>
        
        <header className="site-header" style={{ marginBottom: "60px" }}>
          <a href="/" className="site-brand" style={{ textDecoration: "none" }}>PortShare</a>
          <nav className="header-nav">
            <a className="nav-link" href="/#features">Features</a>
            <a className="nav-link" href="/pricing">Pricing</a>
          </nav>
        </header>

        <div className="section-header">
          <h2>Simple, transparent pricing</h2>
          <p>Start for free, upgrade when you need more bandwidth and power.</p>
        </div>

        <section className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", maxWidth: "900px", margin: "0 auto" }}>
          
          {/* Free Tier */}
          <div className="pricing-card" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "40px" }}>
            <h3 style={{ fontSize: "1.5rem", margin: "0 0 8px" }}>Hobby</h3>
            <div style={{ fontSize: "2.5rem", fontWeight: "800", margin: "0 0 24px" }}>$0<span style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: "500" }}>/mo</span></div>
            <p style={{ color: "var(--text-soft)", marginBottom: "32px" }}>Perfect for local development and occasional webhooks.</p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 40px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <li style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--text-muted)" }}><Check size={18} color="var(--accent)" /> 1 GB Bandwidth / month</li>
              <li style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--text-muted)" }}><Check size={18} color="var(--accent)" /> Permanent subdomain</li>
              <li style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--text-muted)" }}><Check size={18} color="var(--accent)" /> Request Inspector</li>
            </ul>
            <a href="/download/portshare-desktop" className="btn btn-ghost" style={{ width: "100%" }}>Download Free</a>
          </div>

          {/* Pro Tier */}
          <div className="pricing-card" style={{ background: "var(--bg-card)", border: "2px solid var(--accent)", borderRadius: "var(--radius)", padding: "40px", position: "relative" }}>
            <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", background: "var(--text)", color: "var(--bg)", padding: "4px 12px", borderRadius: "99px", fontSize: "0.75rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em" }}>Most Popular</div>
            <h3 style={{ fontSize: "1.5rem", margin: "0 0 8px" }}>Pro</h3>
            <div style={{ fontSize: "2.5rem", fontWeight: "800", margin: "0 0 24px" }}>$12<span style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: "500" }}>/mo</span></div>
            <p style={{ color: "var(--text-soft)", marginBottom: "32px" }}>For professionals who need reliability and branded domains.</p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 40px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <li style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--text-muted)" }}><Check size={18} color="var(--accent)" /> 100 GB Bandwidth / month</li>
              <li style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--text-muted)" }}><Check size={18} color="var(--accent)" /> Custom Domains (BYOD)</li>
              <li style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--text-muted)" }}><Check size={18} color="var(--accent)" /> Google Auth Wall Protection</li>
            </ul>
            
            <div style={{ background: "var(--bg-surface)", padding: "20px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", marginTop: "auto" }}>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "8px" }}>Enter Client ID to upgrade</label>
              <input 
                type="text" 
                placeholder="Client ID (from Desktop App)" 
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                style={{ width: "100%", padding: "10px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--text)", marginBottom: "12px", outline: "none" }}
              />
              <button 
                onClick={handleCheckout} 
                className="btn btn-primary" 
                style={{ width: "100%" }}
                disabled={isBusy}
              >
                {isBusy ? "Processing..." : "Upgrade to Pro"}
              </button>
              {message && <p style={{ fontSize: "0.85rem", color: "var(--accent)", marginTop: "12px", textAlign: "center" }}>{message}</p>}
            </div>
          </div>

        </section>

      </main>
    </div>
  );
}
