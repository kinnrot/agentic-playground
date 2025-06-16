'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import WebhookGenerator from '@/components/WebhookGenerator';
import RequestList from '@/components/RequestList';
import RequestInspector from '@/components/RequestInspector';
import { getWebhookHistory } from '@/lib/api';

interface WebhookRequest {
  id: string;
  timestamp: number;
  method: string;
  headers: Record<string, string>;
  body: any;
  query: Record<string, string>;
  params: Record<string, string>;
  ip: string;
  userAgent: string;
  contentType?: string;
  contentLength?: string;
}

interface WebhookData {
  id: string;
  createdAt: number;
  requests: WebhookRequest[];
}

export default function WebhookPage() {
  const params = useParams();
  const webhookId = params.id as string;
  
  const [webhookData, setWebhookData] = useState<WebhookData | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<WebhookRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (webhookId) {
      loadWebhookData();
    }
  }, [webhookId]);

  const loadWebhookData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getWebhookHistory(webhookId);
      setWebhookData(data);
      
      // Auto-select the first request if available
      if (data.requests && data.requests.length > 0) {
        setSelectedRequest(data.requests[0]);
      }
    } catch (err) {
      console.error('Failed to load webhook data:', err);
      setError('Failed to load webhook data');
    } finally {
      setLoading(false);
    }
  };

  const handleNewRequest = (request: WebhookRequest) => {
    setWebhookData(prev => {
      if (!prev) return null;
      const updatedRequests = [request, ...prev.requests];
      return {
        ...prev,
        requests: updatedRequests
      };
    });
    
    // Auto-select the new request
    setSelectedRequest(request);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading webhook...</p>
        </div>
      </div>
    );
  }

  if (error || !webhookData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Webhook not found'}</p>
          <a href="/" className="text-blue-600 hover:underline">
            ← Back to home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">WebhookTest</h1>
          <p className="text-gray-600">
            Webhook: <code className="bg-gray-100 px-2 py-1 rounded text-sm">{webhookId}</code>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Webhook Info */}
          <div className="lg:col-span-3">
            <WebhookGenerator 
              existingWebhookId={webhookId}
              existingCreatedAt={webhookData.createdAt}
              onNewRequest={handleNewRequest}
            />
          </div>

          {/* Request List */}
          <div className="lg:col-span-1">
            <RequestList
              webhookId={webhookId}
              requests={webhookData.requests}
              selectedRequest={selectedRequest}
              onSelectRequest={setSelectedRequest}
              onNewRequest={handleNewRequest}
            />
          </div>

          {/* Request Inspector */}
          <div className="lg:col-span-2">
            <RequestInspector request={selectedRequest} />
          </div>
        </div>
      </div>
    </div>
  );
}