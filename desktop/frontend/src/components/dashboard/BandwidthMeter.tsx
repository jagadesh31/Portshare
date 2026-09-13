import { Activity } from 'lucide-react'
import { tierOf, type ClientSession } from '../../lib/api'

type BandwidthMeterProps = { session: ClientSession; onVerify?: () => void }

const TIER_LIMIT_LABEL: Record<string, string> = {
  anonymous: '100 MB guest',
  verified: '1 GB verified free',
  pro: '100 GB Pro',
}

export default function BandwidthMeter({ session, onVerify }: BandwidthMeterProps) {
  const tier = tierOf(session)
  return (
    <div className="bandwidth-section">
      <div className="bandwidth-header">
        <span className="bandwidth-label"><Activity size={16} /> Bandwidth Used ({TIER_LIMIT_LABEL[tier] ?? session.plan.toUpperCase()})</span>
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
      {tier === 'anonymous' && (
        <div className="bandwidth-upgrade">
          <button type="button" className="ps-btn ps-btn-ghost ps-btn-sm" onClick={onVerify}>Verify with Google</button> for 1 GB free.
        </div>
      )}
      {tier === 'verified' && (
        <div className="bandwidth-upgrade">
          <a href="https://portshare.kexoz.dev/pricing" target="_blank" rel="noreferrer">Upgrade to Pro</a> for 100 GB limits and custom domains.
        </div>
      )}
    </div>
  )
}
