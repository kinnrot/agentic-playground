const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
require('dotenv').config();

const redis = require('./redis');

const app = express();
const PORT = process.env.PORT || 12001;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:12000', 'https://work-1-ebtojxtmjyezonnw.prod-runtime.all-hands.dev', 'https://work-2-ebtojxtmjyezonnw.prod-runtime.all-hands.dev'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.raw({ type: '*/*', limit: '10mb' }));

// Store for SSE connections
const sseConnections = new Map();

// Generate cryptographically secure webhook ID
const generateWebhookId = () => {
  return crypto.randomBytes(6).toString('hex');
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Generate new webhook endpoint
app.post('/api/generate', async (req, res) => {
  try {
    const webhookId = generateWebhookId();
    const webhookData = {
      id: webhookId,
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      requests: []
    };

    await redis.storeWebhook(webhookId, webhookData);
    
    res.json({
      id: webhookId,
      url: `${req.protocol}://${req.get('host')}/api/webhook/${webhookId}`,
      expiresAt: webhookData.expiresAt
    });
  } catch (error) {
    console.error('Error generating webhook:', error);
    res.status(500).json({ error: 'Failed to generate webhook' });
  }
});

// Get webhook history
app.get('/api/webhook/:id', async (req, res) => {
  try {
    const webhookId = req.params.id;
    const webhook = await redis.getWebhook(webhookId);
    
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found or expired' });
    }
    
    res.json(webhook);
  } catch (error) {
    console.error('Error fetching webhook:', error);
    res.status(500).json({ error: 'Failed to fetch webhook data' });
  }
});

// Clear webhook history
app.delete('/api/webhook/:id', async (req, res) => {
  try {
    const webhookId = req.params.id;
    await redis.clearWebhook(webhookId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing webhook:', error);
    res.status(500).json({ error: 'Failed to clear webhook' });
  }
});

// Server-Sent Events endpoint
app.get('/api/webhook/:id/sse', (req, res) => {
  const webhookId = req.params.id;
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

  // Store connection
  if (!sseConnections.has(webhookId)) {
    sseConnections.set(webhookId, new Set());
  }
  sseConnections.get(webhookId).add(res);

  // Handle client disconnect
  req.on('close', () => {
    if (sseConnections.has(webhookId)) {
      sseConnections.get(webhookId).delete(res);
      if (sseConnections.get(webhookId).size === 0) {
        sseConnections.delete(webhookId);
      }
    }
  });

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping', timestamp: Date.now() })}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

// Webhook receiver - accepts all HTTP methods
app.all('/api/webhook/:id', async (req, res) => {
  try {
    const webhookId = req.params.id;
    
    // Check if webhook exists
    const webhook = await redis.getWebhook(webhookId);
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found or expired' });
    }

    // Parse request body based on content type
    let body = req.body;
    if (req.is('application/json')) {
      // Already parsed by express.json()
    } else if (req.is('application/x-www-form-urlencoded')) {
      // Already parsed by express.urlencoded()
    } else if (req.is('text/*')) {
      body = req.body.toString();
    } else {
      // For other content types, convert buffer to string if possible
      if (Buffer.isBuffer(req.body)) {
        try {
          body = req.body.toString('utf8');
        } catch (e) {
          body = req.body.toString('base64');
        }
      }
    }

    const requestData = {
      id: uuidv4(),
      timestamp: Date.now(),
      method: req.method,
      headers: req.headers,
      body: body || {},
      query: req.query || {},
      params: req.params || {},
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent') || 'Unknown',
      contentType: req.get('Content-Type') || 'unknown',
      contentLength: req.get('Content-Length') || 0
    };

    // Store request in webhook history
    await redis.addWebhookRequest(webhookId, requestData);

    // Send real-time update to connected SSE clients
    if (sseConnections.has(webhookId)) {
      const connections = sseConnections.get(webhookId);
      const message = `data: ${JSON.stringify({ type: 'request', data: requestData })}\n\n`;
      
      connections.forEach(connection => {
        try {
          connection.write(message);
        } catch (error) {
          console.error('Error sending SSE message:', error);
          connections.delete(connection);
        }
      });
    }

    // Return success response
    res.status(200).json({ 
      received: true, 
      timestamp: requestData.timestamp,
      id: requestData.id
    });
  } catch (error) {
    console.error('Error processing webhook request:', error);
    res.status(500).json({ error: 'Failed to process webhook request' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 WebhookTest Backend running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});