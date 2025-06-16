import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}

export function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return `${seconds}s ago`
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false)
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    try {
      document.execCommand('copy')
      textArea.remove()
      return Promise.resolve(true)
    } catch (error) {
      textArea.remove()
      return Promise.resolve(false)
    }
  }
}

export function getMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'text-green-600 bg-green-50'
    case 'POST':
      return 'text-blue-600 bg-blue-50'
    case 'PUT':
      return 'text-yellow-600 bg-yellow-50'
    case 'PATCH':
      return 'text-orange-600 bg-orange-50'
    case 'DELETE':
      return 'text-red-600 bg-red-50'
    default:
      return 'text-gray-600 bg-gray-50'
  }
}

export function formatJSON(obj: any): string {
  try {
    return JSON.stringify(obj, null, 2)
  } catch (error) {
    return String(obj)
  }
}

export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str)
    return true
  } catch (error) {
    return false
  }
}

export function generateCurlCommand(request: any, webhookUrl: string): string {
  let curl = `curl -X ${request.method} '${webhookUrl}'`
  
  // Add headers
  if (request.headers) {
    Object.entries(request.headers).forEach(([key, value]) => {
      if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'content-length') {
        curl += ` \\\n  -H '${key}: ${value}'`
      }
    })
  }
  
  // Add body for POST/PUT/PATCH requests
  if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const bodyStr = typeof request.body === 'string' ? request.body : JSON.stringify(request.body)
    curl += ` \\\n  -d '${bodyStr.replace(/'/g, "\\'")}'`
  }
  
  return curl
}