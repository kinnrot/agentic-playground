# WebhookTest System

A production-ready webhook testing service that allows developers to instantly generate webhook URLs and inspect incoming requests in real-time.

## Features

- 🚀 Instant webhook URL generation
- 📡 Real-time request inspection via Server-Sent Events
- 🔍 Detailed request analysis (headers, body, query params)
- ⏰ 24-hour automatic expiration
- 📋 Copy webhook URLs to clipboard
- 🎯 Support for all HTTP methods
- 💾 Redis-backed temporary storage
- 🌐 Production-ready deployment

## Architecture

- **Frontend**: Next.js 14 with App Router
- **Backend**: Node.js/Express with SSE support
- **Database**: Redis with 24hr TTL
- **Real-time**: Server-Sent Events

## Quick Start

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

- `POST /api/generate` - Generate new webhook ID
- `POST /api/webhook/:id` - Receive webhook data
- `GET /api/webhook/:id` - Get webhook history
- `GET /api/webhook/:id/sse` - Real-time updates
- `DELETE /api/webhook/:id` - Clear webhook history

## Environment Variables

### Backend
```
REDIS_URL=redis://localhost:6379
PORT=3001
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

### Frontend
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Deployment

The system is designed for deployment on:
- **Frontend**: Vercel
- **Backend**: Railway/Render
- **Database**: Upstash Redis

## License

MIT