"use client";

import type { Overview } from "@/lib/types";

export default function UsersTable({ users }: { users: Overview["recentUsers"] }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Recent users</h2>
          <p className="panel-desc">Latest 20 identities by signup date.</p>
        </div>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Client ID</th>
              <th>Subdomain</th>
              <th>Plan</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="mono">{u.id.slice(0, 12)}…</td>
                <td>{u.subdomain ? <span className="mono">{u.subdomain}</span> : <span className="badge dim">—</span>}</td>
                <td>
                  {u.plan === "pro" ? <span className="badge green">pro</span> : <span className="badge">free</span>}
                </td>
                <td style={{ color: "var(--text-muted)" }}>
                  {u.createdAt ? new Date(u.createdAt).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={4} style={{ color: "var(--text-soft)" }}>No users yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
