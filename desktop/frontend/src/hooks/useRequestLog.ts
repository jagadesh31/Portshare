import { useState, useCallback, useRef } from 'react'
import type { RequestLogEntry } from '../lib/api'

export function useRequestLog() {
  const [requestLog, setRequestLog] = useState<RequestLogEntry[]>([])
  const [totalRequests, setTotalRequests] = useState(0)
  const logBodyRef = useRef<HTMLDivElement | null>(null)

  const addLogEntry = useCallback((entry: RequestLogEntry) => {
    setRequestLog(prev => {
      const next = [...prev, entry]
      return next.length > 100 ? next.slice(-100) : next
    })
    setTotalRequests(n => n + 1)
  }, [])

  const clearLog = useCallback(() => {
    setRequestLog([])
    setTotalRequests(0)
  }, [])

  return { requestLog, totalRequests, logBodyRef, addLogEntry, clearLog }
}
