const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export interface WebhookRequest {
  id: string
  timestamp: number
  method: string
  headers: Record<string, string>
  body: any
  query: Record<string, string>
  params: Record<string, string>
  ip: string
  userAgent: string
  contentType: string
  contentLength: string
}

export interface WebhookData {
  id: string
  createdAt: number
  requests: WebhookRequest[]
}

export interface GenerateWebhookResponse {
  id: string
  url: string
  createdAt: number
  expiresAt: number
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  async generateWebhook(): Promise<GenerateWebhookResponse> {
    return this.request<GenerateWebhookResponse>('/api/generate', {
      method: 'POST',
    })
  }

  async getWebhookData(webhookId: string): Promise<WebhookData> {
    return this.request<WebhookData>(`/api/webhook/${webhookId}`)
  }

  async clearWebhookData(webhookId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/webhook/${webhookId}`, {
      method: 'DELETE',
    })
  }

  async getStats(): Promise<{ activeConnections: number; totalWebhooks: number }> {
    return this.request<{ activeConnections: number; totalWebhooks: number }>('/api/stats')
  }

  createSSEConnection(webhookId: string): EventSource {
    const url = `${this.baseUrl}/api/webhook/${webhookId}/sse`
    return new EventSource(url)
  }
}

export const apiClient = new ApiClient()

// Convenience function for getting webhook history
export async function getWebhookHistory(webhookId: string): Promise<WebhookData> {
  return apiClient.getWebhookData(webhookId)
}

// Hook for Server-Sent Events
export function useSSE(
  webhookId: string | null,
  onMessage: (data: any) => void,
  onError?: (error: Event) => void
): EventSource | null {
  if (!webhookId) return null

  const eventSource = apiClient.createSSEConnection(webhookId)

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      onMessage(data)
    } catch (error) {
      console.error('Error parsing SSE data:', error)
    }
  }

  eventSource.onerror = (error) => {
    console.error('SSE error:', error)
    if (onError) {
      onError(error)
    }
  }

  return eventSource
}