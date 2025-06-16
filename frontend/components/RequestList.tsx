'use client'

import { useState, useMemo } from 'react'
import { Search, Filter, Trash2, Download } from 'lucide-react'
import { WebhookRequest } from '@/lib/api'
import { formatTimeAgo, getMethodColor, formatBytes } from '@/lib/utils'

interface RequestListProps {
  requests: WebhookRequest[]
  selectedRequest: WebhookRequest | null
  onSelectRequest: (request: WebhookRequest) => void
  onClearRequests: () => void
}

export default function RequestList({
  requests,
  selectedRequest,
  onSelectRequest,
  onClearRequests
}: RequestListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      const matchesSearch = searchTerm === '' || 
        request.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.ip.includes(searchTerm) ||
        request.userAgent.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(request.body).toLowerCase().includes(searchTerm.toLowerCase())

      const matchesMethod = methodFilter === 'all' || request.method === methodFilter

      return matchesSearch && matchesMethod
    })
  }, [requests, searchTerm, methodFilter])

  const uniqueMethods = useMemo(() => {
    const methods = [...new Set(requests.map(r => r.method))]
    return methods.sort()
  }, [requests])

  const exportRequests = () => {
    const dataStr = JSON.stringify(filteredRequests, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `webhook-requests-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (requests.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-gray-400 mb-4">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Search className="w-8 h-8" />
          </div>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No requests yet
        </h3>
        <p className="text-gray-600">
          Send a request to your webhook URL to see it appear here in real-time
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Requests ({requests.length})
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-secondary"
              title="Toggle filters"
            >
              <Filter className="w-4 h-4" />
            </button>
            <button
              onClick={exportRequests}
              className="btn btn-secondary"
              title="Export requests"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClearRequests}
              className="btn btn-danger"
              title="Clear all requests"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Method:</label>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="input w-auto"
              >
                <option value="all">All Methods</option>
                {uniqueMethods.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Request List */}
      <div className="max-h-96 overflow-y-auto custom-scrollbar">
        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No requests match your filters
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                onClick={() => onSelectRequest(request)}
                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedRequest?.id === request.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getMethodColor(request.method)}`}>
                      {request.method}
                    </span>
                    <span className="text-sm text-gray-600">
                      {formatTimeAgo(request.timestamp)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatBytes(parseInt(request.contentLength) || 0)}
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 mb-1">
                  From: {request.ip}
                </div>
                
                {request.contentType && (
                  <div className="text-xs text-gray-500">
                    {request.contentType}
                  </div>
                )}
                
                {Object.keys(request.query).length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    Query params: {Object.keys(request.query).length}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}