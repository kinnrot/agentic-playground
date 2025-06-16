const redis = require('redis');

// Redis client configuration
const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      console.error('Redis server refused connection');
      return new Error('Redis server refused connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  }
});

// Handle Redis connection events
client.on('connect', () => {
  console.log('📦 Connected to Redis');
});

client.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

client.on('ready', () => {
  console.log('✅ Redis client ready');
});

// Connect to Redis
client.connect().catch(console.error);

// Webhook storage operations
const storeWebhook = async (webhookId, webhookData) => {
  try {
    const key = `webhook:${webhookId}`;
    const ttl = 24 * 60 * 60; // 24 hours in seconds
    
    await client.setEx(key, ttl, JSON.stringify(webhookData));
    console.log(`📝 Stored webhook: ${webhookId}`);
  } catch (error) {
    console.error('Error storing webhook:', error);
    throw error;
  }
};

const getWebhook = async (webhookId) => {
  try {
    const key = `webhook:${webhookId}`;
    const data = await client.get(key);
    
    if (!data) {
      return null;
    }
    
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting webhook:', error);
    throw error;
  }
};

const addWebhookRequest = async (webhookId, requestData) => {
  try {
    const webhook = await getWebhook(webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }
    
    // Add request to the beginning of the array
    webhook.requests.unshift(requestData);
    
    // Keep only the last 100 requests to prevent memory issues
    if (webhook.requests.length > 100) {
      webhook.requests = webhook.requests.slice(0, 100);
    }
    
    // Update webhook data
    await storeWebhook(webhookId, webhook);
    console.log(`📨 Added request to webhook: ${webhookId}`);
  } catch (error) {
    console.error('Error adding webhook request:', error);
    throw error;
  }
};

const clearWebhook = async (webhookId) => {
  try {
    const webhook = await getWebhook(webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }
    
    // Clear requests but keep webhook metadata
    webhook.requests = [];
    await storeWebhook(webhookId, webhook);
    console.log(`🗑️ Cleared webhook requests: ${webhookId}`);
  } catch (error) {
    console.error('Error clearing webhook:', error);
    throw error;
  }
};

const deleteWebhook = async (webhookId) => {
  try {
    const key = `webhook:${webhookId}`;
    await client.del(key);
    console.log(`🗑️ Deleted webhook: ${webhookId}`);
  } catch (error) {
    console.error('Error deleting webhook:', error);
    throw error;
  }
};

// Cleanup expired webhooks (optional background task)
const cleanupExpiredWebhooks = async () => {
  try {
    const keys = await client.keys('webhook:*');
    const now = Date.now();
    
    for (const key of keys) {
      const data = await client.get(key);
      if (data) {
        const webhook = JSON.parse(data);
        if (webhook.expiresAt && webhook.expiresAt < now) {
          await client.del(key);
          console.log(`🧹 Cleaned up expired webhook: ${key}`);
        }
      }
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
};

// Run cleanup every hour
setInterval(cleanupExpiredWebhooks, 60 * 60 * 1000);

module.exports = {
  client,
  storeWebhook,
  getWebhook,
  addWebhookRequest,
  clearWebhook,
  deleteWebhook,
  cleanupExpiredWebhooks
};