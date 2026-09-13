"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  BadgePercent,
  Banknote,
  Bot,
  Eye,
  Layers,
  LogOut,
  TrendingUp,
  Users,
} from "lucide-react";
import { API_BASE, apiGet, formatGB, formatNum } from "@/lib/api";
import type { Me, Overview } from "@/lib/types";
import LoginScreen from "./components/LoginScreen";
import StatCard from "./components/StatCard";
import ViewersChart from "./components/ViewersChart";
import PlansManager from "./components/PlansManager";
import CouponsManager from "./components/CouponsManager";
import UsersTable from "./components/UsersTable";

type Tab = "overview" | "plans" | "coupons" | "users";

export default function AdminPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [data, setData] = useState<Overview | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await apiGet<Me>("/admin/me");
        if (cancelled) return;
        setMe(session);
        if (session.isAdmin) {
          const overview = await apiGet<Overview>("/admin/overview");
          if (!cancelled) setData(overview);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading admin…
      </div>
    );
  }

  if (!me?.isAdmin) {
    return <LoginScreen email={me?.email ?? ""} enabled={me?.enabled ?? false} error={error} />;
  }

  const conversion = data ? data.users.conversionRate : 0;
  const trafficGB =
    data != null ? Math.round(((data.traffic.bytesIn + data.traffic.bytesOut) / 1e9) * 10) / 10 : 0;

  const nav: { id: Tab; label: string; icon: typeof Eye }[] = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "plans", label: "Plans & pricing", icon: Banknote },
    { id: "coupons", label: "Coupons", icon: BadgePercent },
    { id: "users", label: "Users", icon: Users },
  ];

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <div className="admin-brand">
          <div className="admin-brand-mark"><span /></div>
          PortShare Admin
        </div>
        <div className="admin-nav-label">Manage</div>
        {nav.map((item) => (
          <button
            key={item.id}
            className={`admin-nav-btn${tab === item.id ? " active" : ""}`}
            onClick={() => setTab(item.id)}
          >
            <item.icon />
            {item.label}
          </button>
        ))}
        <div className="admin-side-foot">
          <span className="mono" style={{ wordBreak: "break-all" }}>{me.email}</span>
          <button
            className="admin-nav-btn"
            onClick={async () => {
              await fetch(`${API_BASE}/auth/google/logout`, { credentials: "include" });
              window.location.reload();
            }}
          >
            <LogOut /> Sign out
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-top">
          <div>
            <h1 className="admin-title">
              {tab === "overview" && "Overview"}
              {tab === "plans" && "Plans & pricing"}
              {tab === "coupons" && "Discount coupons"}
              {tab === "users" && "Users"}
            </h1>
            <p className="admin-sub">
              {tab === "overview" && "Traffic, revenue signals and tunnel health at a glance."}
              {tab === "plans" && "Prices, bandwidth limits and per-plan discounts."}
              {tab === "coupons" && "Promo codes applied at checkout."}
              {tab === "users" && "Identities, plans and conversion."}
            </p>
          </div>
          <span className="admin-pill"><i />{data ? `${data.tunnels.active} live tunnels` : "…"}</span>
        </div>

        {error && <div className="panel"><div className="err">{error}</div></div>}

        {tab === "overview" && data && (
          <>
            <div className="stat-grid">
              <StatCard icon={Users} label="Users" value={formatNum(data.users.total)}
                hint={<>{formatNum(data.users.paid)} paid · {formatNum(data.users.verified)} verified · {formatNum(data.users.anonymous)} guest</>} />
              <StatCard icon={TrendingUp} label="Conversion" value={`${conversion.toFixed(1)}%`}
                hint={<>paid / total users</>} />
              <StatCard icon={Eye} label="Viewers" value={formatNum(data.viewers.total)}
                hint={<><b>{formatNum(data.viewers.human)}</b> human · {formatNum(data.viewers.bot)} bot</>} />
              <StatCard icon={Layers} label="Traffic" value={formatGB(data.traffic.bytesIn + data.traffic.bytesOut)}
                hint={<>{formatNum(data.traffic.totalRequests)} requests · {trafficGB} GB</>} />
            </div>

            <div className="panel">
              <div className="panel-head">
                <div>
                  <h2 className="panel-title">Viewers — humans vs bots</h2>
                  <p className="panel-desc">Hits on claimed tunnel hosts over the last 14 days.</p>
                </div>
                <span className="badge cyan"><Bot size={13} /> {formatNum(data.viewers.bot)} bots</span>
              </div>
              <ViewersChart byDay={data.viewers.byDay} />
            </div>
          </>
        )}

        {tab === "plans" && data && (
          <PlansManager plans={data.plans} onChange={(plans) => setData({ ...data, plans })} />
        )}

        {tab === "coupons" && data && (
          <CouponsManager coupons={data.coupons} onChange={(coupons) => setData({ ...data, coupons })} />
        )}

        {tab === "users" && data && (
          <>
            <div className="stat-grid">
              <StatCard icon={Users} label="Total users" value={formatNum(data.users.total)} />
              <StatCard icon={Banknote} label="Paid users" value={formatNum(data.users.paid)}
                hint={<>{conversion.toFixed(1)}% conversion</>} />
              <StatCard icon={Activity} label="Verified users" value={formatNum(data.users.verified)}
                hint={<>{formatNum(data.users.anonymous)} still on guest tier</>} />
              <StatCard icon={Layers} label="Active tunnels" value={formatNum(data.tunnels.active)} />
            </div>
            <UsersTable users={data.recentUsers} />
          </>
        )}
      </main>
    </div>
  );
}
