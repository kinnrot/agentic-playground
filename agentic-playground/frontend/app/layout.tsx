import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'WebhookTest - Instant Webhook Testing',
  description: 'Generate instant webhook URLs and inspect incoming requests in real-time. Perfect for testing webhooks, APIs, and integrations.',
  keywords: ['webhook', 'testing', 'api', 'development', 'real-time', 'inspector'],
  authors: [{ name: 'WebhookTest' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#3b82f6',
  openGraph: {
    title: 'WebhookTest - Instant Webhook Testing',
    description: 'Generate instant webhook URLs and inspect incoming requests in real-time.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WebhookTest - Instant Webhook Testing',
    description: 'Generate instant webhook URLs and inspect incoming requests in real-time.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
          {children}
        </div>
      </body>
    </html>
  )
}