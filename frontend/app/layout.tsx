import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WebhookTest - Instant Webhook Testing',
  description: 'Generate webhook URLs instantly and inspect incoming requests in real-time. Perfect for testing webhooks, APIs, and integrations.',
  keywords: 'webhook, testing, api, development, real-time, inspection',
  authors: [{ name: 'WebhookTest' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#3b82f6',
  openGraph: {
    title: 'WebhookTest - Instant Webhook Testing',
    description: 'Generate webhook URLs instantly and inspect incoming requests in real-time.',
    type: 'website',
    url: 'https://webhooktest.dev',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WebhookTest - Instant Webhook Testing',
    description: 'Generate webhook URLs instantly and inspect incoming requests in real-time.',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      </body>
    </html>
  )
}