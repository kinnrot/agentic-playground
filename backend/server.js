require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const redisClient = require('./redis');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// Compression middleware
app.use(compression());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.raw({ type: '*/*', limit: '10mb' }));

// Store SSE connections
const sseConnections = new Map();

// Utility functions
const generateWebhookId = () => {
  return crypto.randomBytes(6).toString('hex');
};

const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.ip;
};

const sendSSEUpdate = (webhookId, data) => {
  const connections = sseConnections.get(webhookId);
  if (connections && connections.size > 0) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    connections.forEach(res => {
      try {
        res.write(message);
      } catch (error) {
        console.error('Error sending SSE update:', error);
        connections.delete(res);
      }
    });
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    redis: redisClient.isConnected ? 'connected' : 'disconnected'
  });
});

// Generate new webhook ID
app.post('/api/generate', async (req, res) => {
  try {
    const webhookId = generateWebhookId();
    const webhookData = await redisClient.createWebhook(webhookId);
    
    res.json({
      id: webhookId,
      url: `${req.protocol}://${req.get('host')}/api/webhook/${webhookId}`,
      createdAt: webhookData.createdAt,
      expiresAt: webhookData.createdAt + (24 * 60 * 60 * 1000) // 24 hours
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
    const webhookData = await redisClient.getWebhookData(webhookId);
    
    if (!webhookData) {
      return res.status(404).json({ error: 'Webhook not found or expired' });
    }
    
    res.json(webhookData);
  } catch (error) {
    console.error('Error getting webhook data:', error);
    res.status(500).json({ error: 'Failed to get webhook data' });
  }
});

// Server-Sent Events endpoint for real-time updates
app.get('/api/webhook/:id/sse', (req, res) => {
  const webhookId = req.params.id;
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': corsOptions.origin.includes(req.headers.origin) ? req.headers.origin : corsOptions.origin[0],
    'Access-Control-Allow-Credentials': 'true'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', webhookId })}\n\n`);

  // Store connection
  if (!sseConnections.has(webhookId)) {
    sseConnections.set(webhookId, new Set());
  }
  sseConnections.get(webhookId).add(res);

  // Handle client disconnect
  req.on('close', () => {
    const connections = sseConnections.get(webhookId);
    if (connections) {
      connections.delete(res);
      if (connections.size === 0) {
        sseConnections.delete(webhookId);
      }
    }
  });

  // Keep connection alive
  const keepAlive = setInterval(() => {
    try {
      res.write(`: keepalive\n\n`);
    } catch (error) {
      clearInterval(keepAlive);
      const connections = sseConnections.get(webhookId);
      if (connections) {
        connections.delete(res);
      }
    }
  }, 30000); // Send keepalive every 30 seconds

  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

// Webhook receiver - accepts all HTTP methods
app.all('/api/webhook/:id', async (req, res) => {
  try {
    const webhookId = req.params.id;
    
    // Check if webhook exists
    const existingWebhook = await redisClient.getWebhookData(webhookId);
    if (!existingWebhook) {
      return res.status(404).json({ error: 'Webhook not found or expired' });
    }

    // Parse request body based on content type
    let parsedBody = req.body;
    const contentType = req.headers['content-type'] || '';
    
    if (contentType.includes('application/json')) {
      // Body is already parsed by express.json()
      parsedBody = req.body;
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // Body is already parsed by express.urlencoded()
      parsedBody = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      // Raw body - convert to string
      parsedBody = req.body.toString();
    } else if (typeof req.body === 'string') {
      // Try to parse as JSON if it looks like JSON
      try {
        if (req.body.trim().startsWith('{') || req.body.trim().startsWith('[')) {
          parsedBody = JSON.parse(req.body);
        } else {
          parsedBody = req.body;
        }
      } catch (e) {
        parsedBody = req.body;
      }
    }

    const requestData = {
      id: uuidv4(),
      timestamp: Date.now(),
      method: req.method,
      headers: req.headers,
      body: parsedBody,
      query: req.query,
      params: req.params,
      ip: getClientIP(req),
      userAgent: req.get('User-Agent') || 'Unknown',
      contentType: contentType,
      contentLength: req.headers['content-length'] || '0'
    };

    // Store request in Redis
    await redisClient.storeWebhookRequest(webhookId, requestData);
    
    // Track usage
    await redisClient.trackWebhookUsage(webhookId);
    
    // Send real-time update to connected clients
    sendSSEUpdate(webhookId, {
      type: 'new_request',
      request: requestData
    });

    // Return success response
    res.status(200).json({ 
      received: true, 
      timestamp: requestData.timestamp,
      requestId: requestData.id
    });
  } catch (error) {
    console.error('Error processing webhook request:', error);
    res.status(500).json({ error: 'Failed to process webhook request' });
  }
});

// Clear webhook history
app.delete('/api/webhook/:id', async (req, res) => {
  try {
    const webhookId = req.params.id;
    await redisClient.deleteWebhookData(webhookId);
    
    // Notify connected clients
    sendSSEUpdate(webhookId, {
      type: 'webhook_cleared'
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing webhook data:', error);
    res.status(500).json({ error: 'Failed to clear webhook data' });
  }
});

// Get webhook statistics (optional)
app.get('/api/stats', async (req, res) => {
  try {
    // This is a basic implementation - in production you might want more detailed stats
    res.json({
      activeConnections: Array.from(sseConnections.keys()).length,
      totalWebhooks: sseConnections.size
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
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
async function startServer() {
  try {
    // Connect to Redis
    await redisClient.connect();
    console.log('Connected to Redis');
    
    // Start HTTP server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`WebhookTest Backend running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`CORS Origin: ${process.env.CORS_ORIGIN}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await redisClient.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await redisClient.disconnect();
  process.exit(0);
});

startServer();