"use client";

import type { DayView } from "@/lib/types";
import { formatNum } from "@/lib/api";

export default function ViewersChart({ byDay }: { byDay: DayView[] }) {
  if (byDay.length === 0) {
    return <p className="panel-desc">No viewer data yet — views on claimed tunnel hosts will show up here.</p>;
  }
  const max = Math.max(1, ...byDay.map((d) => d.human + d.bot));
  return (
    <div>
      <div className="chart">
        {byDay.map((d) => (
          <div className="chart-col" key={d.day} title={`${d.day}: ${formatNum(d.human)} human, ${formatNum(d.bot)} bot`}>
            <div className="chart-bars">
              <div
                className="chart-bar-human"
                style={{ height: `${Math.max(2, (d.human / max) * 100)}%` }}
              />
              <div
                className="chart-bar-bot"
                style={{ height: `${Math.max(2, (d.bot / max) * 100)}%` }}
              />
            </div>
            <div className="chart-day">{d.day.slice(5)}</div>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <span>
          <span className="chart-dot" style={{ background: "var(--green)" }} />
          Humans
        </span>
        <span>
          <span className="chart-dot" style={{ background: "var(--cyan)" }} />
          Bots / crawlers
        </span>
      </div>
    </div>
  );
}
