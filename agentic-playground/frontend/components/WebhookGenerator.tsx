'use client';

import { useState } from 'react';
import { Copy, RefreshCw, Clock, ExternalLink } from 'lucide-react';
import { apiClient, copyToClipboard, formatExpiresIn, type GenerateWebhookResponse } from '@/lib/api';

interface WebhookGeneratorProps {
  onWebhookGenerated: (webhook: GenerateWebhookResponse) => void;
}

export default function WebhookGenerator({ onWebhookGenerated }: WebhookGeneratorProps) {
  const [webhook, setWebhook] = useState<GenerateWebhookResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [expiresIn, setExpiresIn] = useState<string>('');

  const generateWebhook = async () => {
    setIsGenerating(true);
    try {
      const newWebhook = await apiClient.generateWebhook();
      setWebhook(newWebhook);
      onWebhookGenerated(newWebhook);
      updateExpiresIn(newWebhook.expiresAt);
    } catch (error) {
      console.error('Failed to generate webhook:', error);
      alert('Failed to generate webhook. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateExpiresIn = (expiresAt: number) => {
    const updateTimer = () => {
      setExpiresIn(formatExpiresIn(expiresAt));
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute
    
    // Clear interval after 24 hours
    setTimeout(() => clearInterval(interval), 24 * 60 * 60 * 1000);
  };

  const handleCopy = async () => {
    if (!webhook) return;
    
    const success = await copyToClipboard(webhook.url);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const openWebhookUrl = () => {
    if (webhook) {
      window.open(webhook.url, '_blank');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          WebhookTest
        </h1>
        <p className="text-gray-600 text-lg">
          Generate instant webhook URLs and inspect incoming requests in real-time
        </p>
      </div>

      {!webhook ? (
        <div className="text-center">
          <button
            onClick={generateWebhook}
            disabled={isGenerating}
            className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors duration-200 text-lg"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5 mr-2" />
                Generate Webhook URL
              </>
            )}
          </button>
          <p className="text-gray-500 mt-4 text-sm">
            Click to create a unique webhook URL that expires in 24 hours
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Your Webhook URL</h3>
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="w-4 h-4 mr-1" />
                Expires in {expiresIn}
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
              <div className="flex items-center justify-between">
                <code className="text-sm text-gray-800 font-mono break-all flex-1 mr-4">
                  {webhook.url}
                </code>
                <div className="flex space-x-2">
                  <button
                    onClick={handleCopy}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                      copySuccess
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                    }`}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    {copySuccess ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={openWebhookUrl}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-300 transition-colors duration-200"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Open
                  </button>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <p className="mb-2">
                <strong>Webhook ID:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{webhook.id}</code>
              </p>
              <p>
                Send HTTP requests to this URL to see them appear below in real-time.
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={generateWebhook}
              disabled={isGenerating}
              className="inline-flex items-center px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors duration-200"
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
        </div>
      )}
    </div>
  );
}