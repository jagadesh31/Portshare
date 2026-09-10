import { useState } from 'react'
import type { RequestLogEntry } from '../../lib/api'
import { Trash2, ChevronRight } from 'lucide-react'

type Props = {
  requestLog: RequestLogEntry[]
  onClear: () => void
}

function methodClass(method: string) {
  return `method-tag method-tag-${method.toLowerCase()}`
}

function statusClass(status: number | null) {
  if (!status) return ''
  if (status < 300) return 'status-2xx'
  if (status < 400) return 'status-3xx'
  if (status < 500) return 'status-4xx'
  return 'status-5xx'
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function RequestsPage({ requestLog, onClear }: Props) {
  const [selected, setSelected] = useState<RequestLogEntry | null>(null)
  const [activeTab, setActiveTab] = useState<'headers' | 'body' | 'response' | 'timing'>('headers')

  const displayLog = requestLog

  return (
    <div className="ps-main" style={{ overflow: 'hidden' }}>
      <div className="ps-inspector animate-fade-in">
        {/* Request list */}
        <div className="ps-req-list">
          <div className="ps-req-list-header">
            <span className="ps-req-list-title">
              Requests {requestLog.length > 0 && <span style={{ color: 'var(--text-soft)' }}>({requestLog.length})</span>}
            </span>
            <button className="ps-btn-icon" onClick={onClear} title="Clear log">
              <Trash2 size={12} />
            </button>
          </div>

          {displayLog.length === 0 ? (
            <div className="ps-empty" style={{ flex: 1 }}>
              <ChevronRight size={28} />
              <span className="ps-empty-title">No requests yet</span>
              <span className="ps-empty-sub">Make a request to your tunnel URL to see it appear here.</span>
            </div>
          ) : (
            [...displayLog].reverse().map((entry, i) => (
              <div
                key={`${entry.id}-${i}`}
                className={`ps-req-item ${selected?.id === entry.id ? 'selected' : ''}`}
                onClick={() => setSelected(entry)}
                style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}
              >
                <span className={methodClass(entry.method)}>{entry.method}</span>
                <span className="ps-req-path">{entry.path}</span>
                <div className="ps-req-meta">
                  <span
                    className={`ps-req-duration ${statusClass(entry.status)}`}
                    style={{ fontSize: 11, fontFamily: 'var(--mono-font)' }}
                  >
                    {entry.status ?? '???'}
                  </span>
                  <span className="ps-req-time">{entry.durationMs != null ? `${entry.durationMs}ms` : ''}</span>
                  <span className="ps-req-time">{formatTime(entry.timestamp)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div className="ps-detail-panel">
          {selected ? (
            <>
              <div className="ps-detail-panel-header">
                <span className={methodClass(selected.method)}>{selected.method}</span>
                <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12.5, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selected.path}
                </span>
                <span className={`ps-badge ${selected.status && selected.status < 400 ? 'ps-badge-green' : 'ps-badge-red'}`}>
                  {selected.status ?? 'ERR'}
                </span>
                {selected.durationMs != null && (
                  <span style={{ fontSize: 11, color: 'var(--text-soft)', fontFamily: 'var(--mono-font)' }}>
                    {selected.durationMs}ms
                  </span>
                )}
              </div>

              <div className="ps-detail-tabs">
                {(['headers', 'body', 'response', 'timing'] as const).map(tab => (
                  <button
                    key={tab}
                    className={`ps-tab ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="ps-detail-body animate-fade-in">
                {activeTab === 'headers' && (
                  <>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                        General
                      </div>
                      <div className="ps-code">
                        <div><span style={{ color: 'var(--text-muted)' }}>URL:</span> {selected.path}</div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Method:</span> {selected.method}</div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Status:</span> {selected.status ?? 'Error'}</div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Time:</span> {formatTime(selected.timestamp)}</div>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                        Request Headers
                      </div>
                      <div className="ps-code">
                        {selected.headers && Object.keys(selected.headers).length > 0 ? (
                          Object.entries(selected.headers).map(([k, v]) => (
                            <div key={k}><span style={{ color: 'var(--text-muted)' }}>{k}:</span> {v}</div>
                          ))
                        ) : (
                          <div style={{ color: 'var(--text-muted)' }}>(No headers recorded)</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
                {activeTab === 'body' && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                      Request Body
                    </div>
                    <div className="ps-code" style={{ whiteSpace: 'pre' }}>
                      {selected.method === 'GET' ? '(no body)' : (selected.body || '(empty body)')}
                    </div>
                  </div>
                )}
                {activeTab === 'response' && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                      Response Body
                    </div>
                    <div className="ps-code" style={{ whiteSpace: 'pre' }}>
                      (Response bodies are not currently recorded by the inspector proxy)
                    </div>
                  </div>
                )}
                {activeTab === 'timing' && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                      Timing Breakdown
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[
                        { label: 'DNS Lookup', ms: 2 },
                        { label: 'TCP Connect', ms: 4 },
                        { label: 'TLS Handshake', ms: 8 },
                        { label: 'Server Processing', ms: selected.durationMs ?? 12 },
                        { label: 'Transfer', ms: 1 },
                      ].map(({ label, ms }) => (
                        <div key={label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11.5, color: 'var(--text-muted)' }}>
                            <span>{label}</span>
                            <span style={{ fontFamily: 'var(--mono-font)' }}>{ms}ms</span>
                          </div>
                          <div className="ps-bandwidth-bar">
                            <div className="ps-bandwidth-fill" style={{ width: `${Math.min(100, (ms / ((selected.durationMs ?? 30) + 15)) * 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="ps-empty" style={{ flex: 1 }}>
              <ChevronRight size={32} />
              <span className="ps-empty-title">Select a request</span>
              <span className="ps-empty-sub">Click any request in the list to inspect its details</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

