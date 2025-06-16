'use client';

import { useState } from 'react';
import WebhookGenerator from '@/components/WebhookGenerator';
import RequestList from '@/components/RequestList';
import RequestInspector from '@/components/RequestInspector';
import { type GenerateWebhookResponse, type WebhookRequest } from '@/lib/api';

export default function Home() {
  const [currentWebhook, setCurrentWebhook] = useState<GenerateWebhookResponse | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<WebhookRequest | null>(null);

  const handleWebhookGenerated = (webhook: GenerateWebhookResponse) => {
    setCurrentWebhook(webhook);
    setSelectedRequest(null); // Clear selected request when generating new webhook
  };

  const handleRequestSelect = (request: WebhookRequest) => {
    setSelectedRequest(request);
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            WebhookTest
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Generate instant webhook URLs and inspect incoming requests in real-time. 
            Perfect for testing webhooks, APIs, and integrations.
          </p>
        </div>

        {/* Webhook Generator */}
        <WebhookGenerator onWebhookGenerated={handleWebhookGenerated} />

        {/* Main Content - Only show if webhook is generated */}
        {currentWebhook && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Request List */}
            <div className="space-y-6">
              <RequestList
                webhookId={currentWebhook.id}
                onRequestSelect={handleRequestSelect}
                selectedRequestId={selectedRequest?.id}
              />
            </div>

            {/* Request Inspector */}
            <div className="space-y-6">
              <RequestInspector request={selectedRequest} />
            </div>
          </div>
        )}

        {/* Features Section */}
        {!currentWebhook && (
          <div className="mt-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Why Choose WebhookTest?
              </h2>
              <p className="text-lg text-gray-600">
                The fastest way to test and debug webhooks
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-6 bg-white rounded-xl shadow-lg border border-gray-200">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant Generation</h3>
                <p className="text-gray-600">
                  Generate secure webhook URLs in seconds with cryptographically secure 12-character IDs
                </p>
              </div>

              <div className="text-center p-6 bg-white rounded-xl shadow-lg border border-gray-200">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-time Inspection</h3>
                <p className="text-gray-600">
                  See incoming requests instantly with Server-Sent Events. No polling, no delays
                </p>
              </div>

              <div className="text-center p-6 bg-white rounded-xl shadow-lg border border-gray-200">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Production Ready</h3>
                <p className="text-gray-600">
                  Built with security, performance, and reliability in mind. Ready for production use
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-8 border-t border-gray-200 mt-16">
          <p className="text-gray-600">
            Built with Next.js, Express.js, and Redis. 
            <span className="mx-2">•</span>
            Webhooks expire after 24 hours for security
          </p>
        </footer>
      </div>
    </main>
  );
}