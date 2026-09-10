import { Activity } from 'lucide-react'
import type { ClientSession } from '../../lib/api'

type BandwidthMeterProps = { session: ClientSession }

export default function BandwidthMeter({ session }: BandwidthMeterProps) {
  return (
    <div className="bandwidth-section">
      <div className="bandwidth-header">
        <span className="bandwidth-label"><Activity size={16} /> Bandwidth Used ({session.plan.toUpperCase()})</span>
        <span className="bandwidth-values">
          {(session.bandwidthUsed / 1024 / 1024).toFixed(1)} MB / {(session.bandwidthLimit / 1024 / 1024).toFixed(1)} MB
        </span>
      </div>
      <div className="bandwidth-track">
        <div 
          className="bandwidth-fill" 
          style={{ width: `${Math.min(100, (session.bandwidthUsed / session.bandwidthLimit) * 100)}%` }} 
        />
      </div>
      {session.plan === 'free' && (
        <div className="bandwidth-upgrade">
          <a href="http://localhost:3000/pricing" target="_blank" rel="noreferrer">Upgrade to Pro</a> for 100GB limits.
        </div>
      )}
    </div>
  )
}
