"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Plan } from "@/lib/types";
import { apiDelete, apiPost, formatGB, formatMoney } from "@/lib/api";

const empty = { id: "", name: "", price: "", currency: "USD", bandwidthGB: "", features: "", discount: "0" };

export default function PlansManager({ plans, onChange }: { plans: Plan[]; onChange: (p: Plan[]) => void }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await apiPost<{ plans: Plan[] }>("/admin/plans", {
        id: form.id.trim().toLowerCase(),
        name: form.name.trim(),
        priceCents: Math.round(parseFloat(form.price || "0") * 100),
        currency: form.currency || "USD",
        bandwidthLimit: Math.round(parseFloat(form.bandwidthGB || "0") * 1e9),
        features: form.features.split("\n").map((s) => s.trim()).filter(Boolean),
        active: true,
        discountPercent: parseInt(form.discount || "0", 10),
      });
      onChange(res.plans);
      setForm(empty);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(`Delete plan "${id}"?`)) return;
    try {
      const res = await apiDelete<{ plans: Plan[] }>(`/admin/plans/${id}`);
      onChange(res.plans);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Plans &amp; pricing</h2>
          <p className="panel-desc">Create plans or change prices — checkout reads these live.</p>
        </div>
      </div>

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Plan</th>
              <th>Price</th>
              <th>Discount</th>
              <th>Bandwidth</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id}>
                <td>
                  <b>{p.name}</b> <span className="mono" style={{ color: "var(--text-soft)" }}>{p.id}</span>
                  <div style={{ fontSize: 12, color: "var(--text-soft)" }}>{p.features.join(" · ")}</div>
                </td>
                <td>{formatMoney(p.priceCents, p.currency)}</td>
                <td>{p.discountPercent > 0 ? <span className="badge green">−{p.discountPercent}%</span> : <span className="badge dim">—</span>}</td>
                <td>{formatGB(p.bandwidthLimit)}</td>
                <td>{p.active ? <span className="badge green">active</span> : <span className="badge dim">hidden</span>}</td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(p.id)} title="Delete plan">
                    <Trash2 />
                  </button>
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr><td colSpan={6} style={{ color: "var(--text-soft)" }}>No plans yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={save} style={{ marginTop: 18 }}>
        <div className="form-grid">
          <div className="field">
            <label>ID (e.g. pro)</label>
            <input className="input" value={form.id} onChange={set("id")} placeholder="pro" required />
          </div>
          <div className="field">
            <label>Name</label>
            <input className="input" value={form.name} onChange={set("name")} placeholder="Pro" required />
          </div>
          <div className="field">
            <label>Price (major units)</label>
            <input className="input" value={form.price} onChange={set("price")} placeholder="12.00" inputMode="decimal" required />
          </div>
          <div className="field">
            <label>Currency</label>
            <select className="select" value={form.currency} onChange={set("currency")}>
              <option>USD</option>
              <option>INR</option>
              <option>EUR</option>
            </select>
          </div>
          <div className="field">
            <label>Bandwidth (GB)</label>
            <input className="input" value={form.bandwidthGB} onChange={set("bandwidthGB")} placeholder="100" inputMode="decimal" required />
          </div>
          <div className="field">
            <label>Plan discount %</label>
            <input className="input" value={form.discount} onChange={set("discount")} placeholder="0" inputMode="numeric" />
          </div>
          <div className="field full">
            <label>Features (one per line)</label>
            <input className="input" value={form.features} onChange={set("features")} placeholder={"100 GB / month"} />
          </div>
        </div>
        {error && <div className="err">{error}</div>}
        <div className="form-row">
          <button className="btn btn-green" type="submit" disabled={saving}>
            <Plus /> {saving ? "Saving…" : "Create / update plan"}
          </button>
        </div>
      </form>
    </div>
  );
}
