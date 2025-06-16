'use client';

import { useState } from 'react';
import { Copy, Download, Eye, Code, Clock, Globe, User, FileText } from 'lucide-react';
import { formatTimestamp, formatJSON, copyToClipboard, type WebhookRequest } from '@/lib/api';
import { formatBytes } from '@/lib/utils';

interface RequestInspectorProps {
  request: WebhookRequest | null;
}

export default function RequestInspector({ request }: RequestInspectorProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'headers' | 'body' | 'raw'>('overview');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  if (!request) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="text-center text-gray-500">
          <Eye className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">No Request Selected</h3>
          <p>Select a request from the list to inspect its details</p>
        </div>
      </div>
    );
  }

  const handleCopy = async (content: string, type: string) => {
    const success = await copyToClipboard(content);
    if (success) {
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(null), 2000);
    }
  };

  const downloadRequest = () => {
    const dataStr = JSON.stringify(request, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `request-${request.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateCurl = () => {
    const headers = Object.entries(request.headers)
      .filter(([key]) => !['host', 'connection', 'content-length'].includes(key.toLowerCase()))
      .map(([key, value]) => `-H "${key}: ${value}"`)
      .join(' ');

    let curl = `curl -X ${request.method}`;
    if (headers) curl += ` ${headers}`;
    if (request.body && Object.keys(request.body).length > 0) {
      curl += ` -d '${JSON.stringify(request.body)}'`;
    }
    curl += ` "YOUR_WEBHOOK_URL"`;

    return curl;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'headers', label: 'Headers', icon: FileText },
    { id: 'body', label: 'Body', icon: Code },
    { id: 'raw', label: 'Raw', icon: Download },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Request Inspector</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleCopy(generateCurl(), 'curl')}
              className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                copySuccess === 'curl'
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
              }`}
            >
              <Copy className="w-4 h-4 mr-1" />
              {copySuccess === 'curl' ? 'Copied!' : 'Copy cURL'}
            </button>
            <button
              onClick={downloadRequest}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 transition-colors duration-200"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </button>
          </div>
        </div>

        {/* Request Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800`}>
              {request.method}
            </span>
            <span className="text-gray-600">Method</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900">{formatTimestamp(request.timestamp)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900">{request.ip}</span>
          </div>
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900">{formatBytes(parseInt(request.contentLength.toString()) || 0)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Request Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Request ID</label>
                    <code className="block text-sm bg-gray-100 p-2 rounded border">{request.id}</code>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
                    <code className="block text-sm bg-gray-100 p-2 rounded border">{request.contentType}</code>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Content Length</label>
                    <code className="block text-sm bg-gray-100 p-2 rounded border">{request.contentLength} bytes</code>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                    <code className="block text-sm bg-gray-100 p-2 rounded border">{request.ip}</code>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User Agent</label>
                    <code className="block text-sm bg-gray-100 p-2 rounded border break-all">{request.userAgent}</code>
                  </div>
                </div>
              </div>
            </div>

            {Object.keys(request.query).length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Query Parameters</h3>
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                    {formatJSON(request.query)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'headers' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">HTTP Headers</h3>
              <button
                onClick={() => handleCopy(formatJSON(request.headers), 'headers')}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  copySuccess === 'headers'
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                }`}
              >
                <Copy className="w-4 h-4 mr-1" />
                {copySuccess === 'headers' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {Object.entries(request.headers).map(([key, value]) => (
                  <div key={key} className="flex">
                    <span className="font-medium text-blue-600 w-1/3 break-all">{key}:</span>
                    <span className="text-gray-800 w-2/3 break-all ml-2">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'body' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Request Body</h3>
              <button
                onClick={() => handleCopy(formatJSON(request.body), 'body')}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  copySuccess === 'body'
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                }`}
              >
                <Copy className="w-4 h-4 mr-1" />
                {copySuccess === 'body' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border max-h-96 overflow-y-auto">
              {request.body && Object.keys(request.body).length > 0 ? (
                <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                  {formatJSON(request.body)}
                </pre>
              ) : (
                <p className="text-gray-500 italic">No body content</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'raw' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Raw Request Data</h3>
              <button
                onClick={() => handleCopy(formatJSON(request), 'raw')}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  copySuccess === 'raw'
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                }`}
              >
                <Copy className="w-4 h-4 mr-1" />
                {copySuccess === 'raw' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border max-h-96 overflow-y-auto">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                {formatJSON(request)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}