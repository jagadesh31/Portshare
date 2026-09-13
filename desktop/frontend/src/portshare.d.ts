export {};

type LocalRequestPayload = {
  port: number
  method: string
  path: string
  headers: Record<string, string>
  /** Raw request body (v2 binary IPC). */
  body?: Uint8Array
  /** Legacy fallback; only used if main still expects base64. */
  bodyBase64?: string
}

type LocalRequestResult = {
  status: number
  headers: Record<string, string[]>
  /** Raw response body (Uint8Array over Electron IPC). */
  body: Uint8Array | ArrayBuffer
}

declare global {
  interface Window {
    portshare?: {
      localRequest: (payload: LocalRequestPayload) => Promise<LocalRequestResult>
    }
  }
}
