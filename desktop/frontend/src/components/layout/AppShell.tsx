import type { ReactNode } from 'react'

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="portshare-root">
      <div className="ambient-glow ambient-glow-left" />
      <div className="ambient-glow ambient-glow-right" />
      <section className="console-shell">
        {children}
      </section>
    </div>
  )
}
