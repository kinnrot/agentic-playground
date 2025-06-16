'use client'

import { useState, useEffect, useRef } from 'react'
import { Wifi, WifiOff, AlertCircle } from 'lucide-react'
import WebhookGenerator from '@/components/WebhookGenerator'
import RequestList from '@/components/RequestList'
import RequestInspector from '@/components/RequestInspector'
import { apiClient, GenerateWebhookResponse, WebhookRequest, WebhookData } from '@/lib/api'

export default function Home() {
  const [webhook, setWebhook] = useState<GenerateWebhookResponse | null>(null)
  const [requests, setRequests] = useState<WebhookRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<WebhookRequest | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Setup SSE connection when webhook is generated
  useEffect(() => {
    if (!webhook) {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      setIsConnected(false)
      return
    }

    // Load existing requests
    loadWebhookData(webhook.id)

    // Setup SSE connection
    const eventSource = apiClient.createSSEConnection(webhook.id)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setIsConnected(true)
      setError(null)
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'connected') {
          setIsConnected(true)
        } else if (data.type === 'new_request') {
          setRequests(prev => [data.request, ...prev])
          // Auto-select first request if none selected
          setSelectedRequest(current => current || data.request)
        } else if (data.type === 'webhook_cleared') {
          setRequests([])
          setSelectedRequest(null)
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE error:', error)
      setIsConnected(false)
      setError('Connection lost. Trying to reconnect...')
      
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (webhook) {
          loadWebhookData(webhook.id)
        }
      }, 5000)
    }

    return () => {
      eventSource.close()
    }
  }, [webhook])

  const loadWebhookData = async (webhookId: string) => {
    try {
      const data: WebhookData = await apiClient.getWebhookData(webhookId)
      setRequests(data.requests || [])
      setSelectedRequest(data.requests?.[0] || null)
      setError(null)
    } catch (error) {
      console.error('Error loading webhook data:', error)
      setError('Failed to load webhook data')
    }
  }

  const handleWebhookGenerated = (newWebhook: GenerateWebhookResponse) => {
    setWebhook(newWebhook)
    setRequests([])
    setSelectedRequest(null)
    setError(null)
  }

  const handleClearRequests = async () => {
    if (!webhook) return

    try {
      await apiClient.clearWebhookData(webhook.id)
      setRequests([])
      setSelectedRequest(null)
    } catch (error) {
      console.error('Error clearing requests:', error)
      setError('Failed to clear requests')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <WebhookGenerator onWebhookGenerated={handleWebhookGenerated} />
        </div>

        {/* Connection Status */}
        {webhook && (
          <div className="mb-4">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
              isConnected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 mr-1" />
                  Connected - Real-time updates active
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 mr-1" />
                  Disconnected - Attempting to reconnect...
                </>
              )}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Main Content */}
        {webhook && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Request List */}
            <div>
              <RequestList
                requests={requests}
                selectedRequest={selectedRequest}
                onSelectRequest={setSelectedRequest}
                onClearRequests={handleClearRequests}
              />
            </div>

            {/* Request Inspector */}
            <div>
              <RequestInspector
                request={selectedRequest}
                webhookUrl={webhook.url}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200">
          <div className="text-center text-gray-600">
            <p className="mb-2">
              Built with Next.js, Express, and Redis
            </p>
            <p className="text-sm">
              Webhooks expire after 24 hours • Open source on GitHub
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}