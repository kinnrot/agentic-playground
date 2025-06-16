'use client'

import { useState } from 'react'
import { Copy, Download, Code, Eye, Clock, Globe, User } from 'lucide-react'
import { WebhookRequest } from '@/lib/api'
import { formatTimestamp, formatJSON, copyToClipboard, generateCurlCommand, getMethodColor } from '@/lib/utils'

interface RequestInspectorProps {
  request: WebhookRequest | null
  webhookUrl?: string
}

type TabType = 'overview' | 'headers' | 'body' | 'raw'

export default function RequestInspector({ request, webhookUrl }: RequestInspectorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [copySuccess, setCopySuccess] = useState<string | null>(null)

  if (!request) {
    return (
      <div className="card p-8 text-center">
        <div className="text-gray-400 mb-4">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Eye className="w-8 h-8" />
          </div>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Select a request
        </h3>
        <p className="text-gray-600">
          Choose a request from the list to inspect its details
        </p>
      </div>
    )
  }

  const handleCopy = async (text: string, type: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopySuccess(type)
      setTimeout(() => setCopySuccess(null), 2000)
    }
  }

  const exportRequest = () => {
    const dataStr = JSON.stringify(request, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `request-${request.id}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'headers', label: 'Headers', icon: Globe },
    { id: 'body', label: 'Body', icon: Code },
    { id: 'raw', label: 'Raw', icon: User }
  ]

  return (
    <div className="card">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 text-sm font-medium rounded ${getMethodColor(request.method)}`}>
              {request.method}
            </span>
            <span className="text-lg font-semibold text-gray-900">
              Request Details
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => webhookUrl && handleCopy(generateCurlCommand(request, webhookUrl), 'curl')}
              className="btn btn-secondary text-sm"
              title="Copy as cURL"
            >
              <Code className="w-4 h-4 mr-1" />
              {copySuccess === 'curl' ? 'Copied!' : 'cURL'}
            </button>
            <button
              onClick={exportRequest}
              className="btn btn-secondary text-sm"
              title="Export request"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4 mr-1 inline" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timestamp</label>
                <div className="flex items-center text-sm text-gray-900">
                  <Clock className="w-4 h-4 mr-2 text-gray-400" />
                  {formatTimestamp(request.timestamp)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Request ID</label>
                <div className="text-sm text-gray-900 font-mono">{request.id}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                <div className="text-sm text-gray-900">{request.ip}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
                <div className="text-sm text-gray-900">{request.contentType || 'Not specified'}</div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User Agent</label>
              <div className="text-sm text-gray-900 break-all">{request.userAgent}</div>
            </div>

            {Object.keys(request.query).length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Query Parameters</label>
                <div className="bg-gray-50 rounded-lg p-3">
                  <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                    {formatJSON(request.query)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'headers' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">Request Headers</label>
              <button
                onClick={() => handleCopy(formatJSON(request.headers), 'headers')}
                className="btn btn-secondary text-sm"
              >
                <Copy className="w-4 h-4 mr-1" />
                {copySuccess === 'headers' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto custom-scrollbar">
              <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                {formatJSON(request.headers)}
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'body' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">Request Body</label>
              <button
                onClick={() => handleCopy(typeof request.body === 'string' ? request.body : formatJSON(request.body), 'body')}
                className="btn btn-secondary text-sm"
              >
                <Copy className="w-4 h-4 mr-1" />
                {copySuccess === 'body' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto custom-scrollbar">
              {request.body ? (
                <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                  {typeof request.body === 'string' ? request.body : formatJSON(request.body)}
                </pre>
              ) : (
                <div className="text-sm text-gray-500 italic">No body content</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'raw' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">Raw Request Data</label>
              <button
                onClick={() => handleCopy(formatJSON(request), 'raw')}
                className="btn btn-secondary text-sm"
              >
                <Copy className="w-4 h-4 mr-1" />
                {copySuccess === 'raw' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto custom-scrollbar">
              <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                {formatJSON(request)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}