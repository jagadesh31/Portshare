"use client";

import { ShieldCheck } from "lucide-react";
import { loginUrl } from "@/lib/api";

export default function LoginScreen({
  email,
  enabled,
  error,
}: {
  email: string;
  enabled: boolean;
  error?: string;
}) {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="admin-brand" style={{ justifyContent: "center", padding: 0 }}>
          <div className="admin-brand-mark"><span /></div>
          PortShare Admin
        </div>
        <h1>Restricted area</h1>
        <p>Sign in with an authorized Google account to manage plans, coupons and stats.</p>
        {email && <div className="login-email">{email} — not authorized</div>}
        {error ? (
          <p style={{ color: "var(--red, #f87171)" }}>
            Could not reach the API: {error}
          </p>
        ) : (
          !enabled && (
            <p style={{ color: "var(--amber)" }}>
              Google OAuth is not configured on the server (GOOGLE_CLIENT_ID).
            </p>
          )
        )}
        <button className="btn" style={{ width: "100%" }} onClick={() => (window.location.href = loginUrl())}>
          <ShieldCheck /> Sign in with Google
        </button>
      </div>
    </div>
  );
}
