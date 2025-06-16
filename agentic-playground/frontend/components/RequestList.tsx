'use client';

import { useState, useEffect } from 'react';
import { Search, Trash2, Filter, Download } from 'lucide-react';
import { apiClient, formatTimeAgo, getMethodColor, type WebhookRequest } from '@/lib/api';

interface RequestListProps {
  webhookId: string;
  onRequestSelect: (request: WebhookRequest) => void;
  selectedRequestId?: string;
}

export default function RequestList({ webhookId, onRequestSelect, selectedRequestId }: RequestListProps) {
  const [requests, setRequests] = useState<WebhookRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<WebhookRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    if (!webhookId) return;

    // Load initial webhook data
    loadWebhookData();

    // Setup SSE connection
    const eventSource = new EventSource(apiClient.getSSEUrl(webhookId));

    eventSource.onopen = () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      console.log('SSE connection opened');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'request') {
          setRequests(prev => [data.data, ...prev]);
        } else if (data.type === 'connected') {
          setConnectionStatus('connected');
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      setIsConnected(false);
      setConnectionStatus('disconnected');
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
      setConnectionStatus('disconnected');
    };
  }, [webhookId]);

  useEffect(() => {
    // Filter requests based on search term and method filter
    let filtered = requests;

    if (searchTerm) {
      filtered = filtered.filter(request =>
        request.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.ip.includes(searchTerm) ||
        request.userAgent.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(request.body).toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(request.headers).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (methodFilter !== 'all') {
      filtered = filtered.filter(request => request.method === methodFilter);
    }

    setFilteredRequests(filtered);
  }, [requests, searchTerm, methodFilter]);

  const loadWebhookData = async () => {
    try {
      const webhook = await apiClient.getWebhook(webhookId);
      setRequests(webhook.requests || []);
    } catch (error) {
      console.error('Error loading webhook data:', error);
    }
  };

  const clearRequests = async () => {
    if (confirm('Are you sure you want to clear all requests?')) {
      try {
        await apiClient.clearWebhook(webhookId);
        setRequests([]);
      } catch (error) {
        console.error('Error clearing requests:', error);
        alert('Failed to clear requests');
      }
    }
  };

  const exportRequests = () => {
    const dataStr = JSON.stringify(filteredRequests, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `webhook-${webhookId}-requests.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const uniqueMethods = Array.from(new Set(requests.map(r => r.method)));

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Incoming Requests
            </h2>
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
              connectionStatus === 'connected' 
                ? 'bg-green-100 text-green-800' 
                : connectionStatus === 'connecting'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' 
                  ? 'bg-green-500 animate-pulse' 
                  : connectionStatus === 'connecting'
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-red-500'
              }`} />
              <span className="capitalize">{connectionStatus}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={exportRequests}
              disabled={filteredRequests.length === 0}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-md transition-colors duration-200"
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </button>
            <button
              onClick={clearRequests}
              disabled={requests.length === 0}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-md transition-colors duration-200"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">All Methods</option>
              {uniqueMethods.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Request List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {requests.length === 0 ? (
              <div>
                <p className="text-lg mb-2">No requests yet</p>
                <p className="text-sm">Send a request to your webhook URL to see it appear here</p>
              </div>
            ) : (
              <p>No requests match your filters</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                onClick={() => onRequestSelect(request)}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150 ${
                  selectedRequestId === request.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getMethodColor(request.method)}`}>
                      {request.method}
                    </span>
                    <span className="text-sm text-gray-600">
                      {formatTimeAgo(request.timestamp)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {request.ip}
                  </span>
                </div>
                
                <div className="text-sm text-gray-700 mb-1">
                  <span className="font-medium">Content-Type:</span> {request.contentType}
                </div>
                
                {request.userAgent && (
                  <div className="text-xs text-gray-500 truncate">
                    {request.userAgent}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}