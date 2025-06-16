'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, RefreshCw, Clock, ExternalLink } from 'lucide-react'
import { apiClient, GenerateWebhookResponse } from '@/lib/api'
import { copyToClipboard, formatTimeAgo } from '@/lib/utils'

interface WebhookGeneratorProps {
  onWebhookGenerated?: (webhook: GenerateWebhookResponse) => void
  onNewRequest?: (request: any) => void
  existingWebhookId?: string
  existingCreatedAt?: number
}

export default function WebhookGenerator({ 
  onWebhookGenerated, 
  onNewRequest,
  existingWebhookId,
  existingCreatedAt 
}: WebhookGeneratorProps) {
  const router = useRouter()
  const [webhook, setWebhook] = useState<GenerateWebhookResponse | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (existingWebhookId && existingCreatedAt) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:12001'
      const webhookData: GenerateWebhookResponse = {
        id: existingWebhookId,
        url: `${apiUrl}/api/webhook/${existingWebhookId}`,
        createdAt: existingCreatedAt,
        expiresAt: existingCreatedAt + (24 * 60 * 60 * 1000)
      }
      setWebhook(webhookData)
    }
  }, [existingWebhookId, existingCreatedAt])

  const generateWebhook = async () => {
    setIsGenerating(true)
    setError(null)
    
    try {
      const newWebhook = await apiClient.generateWebhook()
      setWebhook(newWebhook)
      onWebhookGenerated?.(newWebhook)
      
      // Navigate to the new webhook page
      router.push(`/webhook/${newWebhook.id}`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate webhook')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!webhook) return
    
    const success = await copyToClipboard(webhook.url)
    setCopySuccess(success)
    
    if (success) {
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  const getTimeRemaining = () => {
    if (!webhook) return null
    
    const now = Date.now()
    const remaining = webhook.expiresAt - now
    
    if (remaining <= 0) return 'Expired'
    
    const hours = Math.floor(remaining / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
    
    return `${hours}h ${minutes}m remaining`
  }

  return (
    <div className="card p-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          WebhookTest
        </h1>
        <p className="text-gray-600">
          Generate webhook URLs instantly and inspect incoming requests in real-time
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {!webhook ? (
        <div className="text-center">
          <button
            onClick={generateWebhook}
            disabled={isGenerating}
            className="btn btn-primary text-lg px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Webhook URL'
            )}
          </button>
          <p className="text-sm text-gray-500 mt-3">
            Your webhook will be available for 24 hours
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Webhook URL
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={webhook.url}
                readOnly
                className="input flex-1 font-mono text-sm bg-gray-50"
              />
              <button
                onClick={handleCopy}
                className={`btn ${copySuccess ? 'btn-primary' : 'btn-secondary'} flex-shrink-0`}
                title="Copy to clipboard"
              >
                <Copy className="w-4 h-4" />
                {copySuccess ? 'Copied!' : 'Copy'}
              </button>
              <a
                href={webhook.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary flex-shrink-0"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {getTimeRemaining()}
            </div>
            <div>
              Created {formatTimeAgo(webhook.createdAt)}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={generateWebhook}
              disabled={isGenerating}
              className="btn btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate New URL
                </>
              )}
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">How to use:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Send HTTP requests to your webhook URL</li>
              <li>• View requests in real-time below</li>
              <li>• Inspect headers, body, and query parameters</li>
              <li>• Export requests as JSON or cURL commands</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}