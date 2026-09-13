import axios from 'axios'
import { parsePort } from './utils'

export type FlowStep = 'loading' | 'subdomain' | 'dashboard'

export type ClientSession = {
  id: string
  subdomain: string
  port: number | null
  customDomain: string
  requireAuth: boolean
  plan: string
  bandwidthUsed: number
  bandwidthLimit: number
}

export type IdentityResponse = {
  id: string
  subdomain?: string | null
  port?: number | null
  customDomain?: string | null
  requireAuth?: boolean
  plan?: string
  bandwidthUsed?: number
  bandwidthLimit?: number
}

export type AuthResponse = { requireAuth: boolean; gauthEnabled: boolean }

export type AvailabilityResponse = {
  available?: boolean
  exists?: boolean
}

export type PortResponse = { port?: number }
export type DomainResponse = { customDomain: string }

export type TunnelRequest = {
  id: string
  method: string
  path: string
  headers: Record<string, string[]>
  body?: string
}

export type RequestLogEntry = {
  id: string
  method: string
  path: string
  status: number | null
  timestamp: string
  durationMs: number | null
  headers?: Record<string, string>
  body?: string
}

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected'

const requiredEnv = (value: string | undefined, name: string): string => {
  if (!value?.trim()) throw new Error(`Missing required environment variable: ${name}`)
  return value.trim()
}

export const API_BASE_URL = requiredEnv(import.meta.env.VITE_PORTSHARE_API_BASE, 'VITE_PORTSHARE_API_BASE')
export const ROOT_DOMAIN  = requiredEnv(import.meta.env.VITE_PORTSHARE_ROOT_DOMAIN, 'VITE_PORTSHARE_ROOT_DOMAIN')

export const ensureClientIdentity = async (existingId: string | null): Promise<ClientSession> => {
  const payload = existingId ? { id: existingId } : {}
  const { data } = await axios.post<IdentityResponse>(`${API_BASE_URL}/client/identity`, payload)
  if (!data.id) throw new Error('Server did not return a valid client id.')
  return {
    id: data.id,
    subdomain: data.subdomain?.trim().toLowerCase() ?? '',
    port: parsePort(data.port),
    customDomain: data.customDomain?.trim().toLowerCase() ?? '',
    requireAuth: data.requireAuth ?? false,
    plan: data.plan ?? 'free',
    bandwidthUsed: data.bandwidthUsed ?? 0,
    bandwidthLimit: data.bandwidthLimit ?? 1073741824,
  }
}

export const checkSubdomainAvailability = async (name: string): Promise<boolean> => {
  const { data } = await axios.get<AvailabilityResponse>(`${API_BASE_URL}/subdomain/check`, { params: { name } })
  if (typeof data.available === 'boolean') return data.available
  if (typeof data.exists   === 'boolean') return !data.exists
  throw new Error('Unexpected response while checking subdomain availability.')
}

export const claimSubdomain = async (clientId: string, subdomain: string): Promise<void> => {
  await axios.post(`${API_BASE_URL}/subdomain/claim`, { clientId, subdomain })
}

export const updateExposedPort = async (clientId: string, port: number): Promise<number> => {
  const { data } = await axios.put<PortResponse>(`${API_BASE_URL}/client/port`, { clientId, port })
  return parsePort(data.port) ?? port
}

export const updateCustomDomain = async (clientId: string, domain: string): Promise<string> => {
  const { data } = await axios.put<DomainResponse>(`${API_BASE_URL}/client/domain`, { clientId, domain })
  return data.customDomain
}

export type ClientStatsResponse = {
  totalRequests?: number
  bytesIn?: number
  bytesOut?: number
  bandwidthUsed?: number
  bandwidthLimit?: number
}

export const fetchClientStats = async (clientId: string): Promise<ClientStatsResponse> => {
  const { data } = await axios.get<ClientStatsResponse>(`${API_BASE_URL}/client/stats`, {
    params: { clientId },
  })
  return data
}

export const updateClientAuth = async (clientId: string, requireAuth: boolean): Promise<AuthResponse> => {
  const { data } = await axios.put<AuthResponse>(`${API_BASE_URL}/client/auth`, { clientId, requireAuth })
  return data
}
