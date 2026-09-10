'use client';

import { useState } from "react";

export default function CheckoutForm() {
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
      
      setMessage("Redirecting to secure checkout...");
      
      setTimeout(async () => {
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
  );
}
