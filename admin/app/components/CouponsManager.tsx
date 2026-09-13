"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Coupon } from "@/lib/types";
import { apiDelete, apiPost } from "@/lib/api";

const empty = { code: "", percent: "", amount: "", max: "", expires: "" };

export default function CouponsManager({ coupons, onChange }: { coupons: Coupon[]; onChange: (c: Coupon[]) => void }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await apiPost<{ coupons: Coupon[] }>("/admin/coupons", {
        code: form.code.trim().toUpperCase(),
        percentOff: parseInt(form.percent || "0", 10),
        amountOffCents: Math.round(parseFloat(form.amount || "0") * 100),
        maxRedemptions: parseInt(form.max || "0", 10),
        active: true,
        expiresAt: form.expires ? new Date(form.expires).toISOString() : "",
      });
      onChange(res.coupons);
      setForm(empty);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(code: string) {
    if (!confirm(`Delete coupon "${code}"?`)) return;
    try {
      const res = await apiDelete<{ coupons: Coupon[] }>(`/admin/coupons/${code}`);
      onChange(res.coupons);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Discount coupons</h2>
          <p className="panel-desc">Percent-off or amount-off codes applied at checkout.</p>
        </div>
      </div>

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Redemptions</th>
              <th>Expires</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.code}>
                <td className="mono"><b>{c.code}</b></td>
                <td>
                  {c.percentOff > 0 ? `${c.percentOff}%` : ""}
                  {c.percentOff > 0 && c.amountOffCents > 0 ? " + " : ""}
                  {c.amountOffCents > 0 ? `$${(c.amountOffCents / 100).toFixed(2)}` : ""}
                </td>
                <td>{c.redeemedCount}{c.maxRedemptions > 0 ? ` / ${c.maxRedemptions}` : " / ∞"}</td>
                <td>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "—"}</td>
                <td>
                  {c.active ? <span className="badge green">active</span> : <span className="badge dim">off</span>}
                </td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(c.code)} title="Delete coupon">
                    <Trash2 />
                  </button>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr><td colSpan={6} style={{ color: "var(--text-soft)" }}>No coupons yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={save} style={{ marginTop: 18 }}>
        <div className="form-grid">
          <div className="field">
            <label>Code</label>
            <input className="input mono" value={form.code} onChange={set("code")} placeholder="LAUNCH20" required />
          </div>
          <div className="field">
            <label>Percent off (0–100)</label>
            <input className="input" value={form.percent} onChange={set("percent")} placeholder="20" inputMode="numeric" />
          </div>
          <div className="field">
            <label>Amount off (major units)</label>
            <input className="input" value={form.amount} onChange={set("amount")} placeholder="5.00" inputMode="decimal" />
          </div>
          <div className="field">
            <label>Max redemptions (0 = ∞)</label>
            <input className="input" value={form.max} onChange={set("max")} placeholder="100" inputMode="numeric" />
          </div>
          <div className="field">
            <label>Expires at</label>
            <input className="input" type="date" value={form.expires} onChange={set("expires")} />
          </div>
        </div>
        {error && <div className="err">{error}</div>}
        <div className="form-row">
          <button className="btn btn-green" type="submit" disabled={saving}>
            <Plus /> {saving ? "Saving…" : "Create / update coupon"}
          </button>
        </div>
      </form>
    </div>
  );
}
