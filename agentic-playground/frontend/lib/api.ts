const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:12001';

export interface WebhookRequest {
  id: string;
  timestamp: number;
  method: string;
  headers: Record<string, string>;
  body: any;
  query: Record<string, string>;
  params: Record<string, string>;
  ip: string;
  userAgent: string;
  contentType: string;
  contentLength: number;
}

export interface Webhook {
  id: string;
  createdAt: number;
  expiresAt: number;
  requests: WebhookRequest[];
}

export interface GenerateWebhookResponse {
  id: string;
  url: string;
  expiresAt: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async generateWebhook(): Promise<GenerateWebhookResponse> {
    return this.request<GenerateWebhookResponse>('/api/generate', {
      method: 'POST',
    });
  }

  async getWebhook(id: string): Promise<Webhook> {
    return this.request<Webhook>(`/api/webhook/${id}`);
  }

  async clearWebhook(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/webhook/${id}`, {
      method: 'DELETE',
    });
  }

  getSSEUrl(id: string): string {
    return `${this.baseUrl}/api/webhook/${id}/sse`;
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/health');
  }
}

export const apiClient = new ApiClient();

// Utility functions
export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};

export const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
};

export const formatExpiresIn = (expiresAt: number): string => {
  const now = Date.now();
  const diff = expiresAt - now;
  
  if (diff <= 0) return 'Expired';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

export const formatJSON = (obj: any): string => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (error) {
    return String(obj);
  }
};

export const getMethodColor = (method: string): string => {
  const colors: Record<string, string> = {
    GET: 'bg-green-100 text-green-800',
    POST: 'bg-blue-100 text-blue-800',
    PUT: 'bg-yellow-100 text-yellow-800',
    DELETE: 'bg-red-100 text-red-800',
    PATCH: 'bg-purple-100 text-purple-800',
    OPTIONS: 'bg-gray-100 text-gray-800',
    HEAD: 'bg-indigo-100 text-indigo-800',
  };
  
  return colors[method.toUpperCase()] || 'bg-gray-100 text-gray-800';
};

export const getStatusColor = (status: number): string => {
  if (status >= 200 && status < 300) return 'text-green-600';
  if (status >= 300 && status < 400) return 'text-yellow-600';
  if (status >= 400 && status < 500) return 'text-orange-600';
  if (status >= 500) return 'text-red-600';
  return 'text-gray-600';
};