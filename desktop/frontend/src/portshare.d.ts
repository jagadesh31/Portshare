export {};

type LocalRequestPayload = {
  port: number
  method: string
  path: string
  headers: Record<string, string>
  bodyBase64?: string
}

type LocalRequestResult = {
  status: number
  headers: Record<string, string[]>
  body: string
}

declare global {
  interface Window {
    portshare?: {
      localRequest: (payload: LocalRequestPayload) => Promise<LocalRequestResult>
    }
  }
}
