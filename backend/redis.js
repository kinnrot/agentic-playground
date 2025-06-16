const redis = require('redis');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = redis.createClient({
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

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis Client Connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        console.log('Redis Client Ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.log('Redis Client Disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
    }
  }

  // Webhook data operations
  async storeWebhookRequest(webhookId, requestData) {
    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }

    const key = `webhook:${webhookId}`;
    
    try {
      const webhook = await this.client.get(key);
      
      if (webhook) {
        const data = JSON.parse(webhook);
        data.requests.unshift(requestData);
        // Keep only last 100 requests to prevent memory issues
        data.requests = data.requests.slice(0, 100);
        await this.client.setEx(key, 86400, JSON.stringify(data)); // 24 hours TTL
      } else {
        const newWebhook = {
          id: webhookId,
          createdAt: Date.now(),
          requests: [requestData]
        };
        await this.client.setEx(key, 86400, JSON.stringify(newWebhook));
      }
      
      return true;
    } catch (error) {
      console.error('Error storing webhook request:', error);
      throw error;
    }
  }

  async getWebhookData(webhookId) {
    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }

    const key = `webhook:${webhookId}`;
    
    try {
      const webhook = await this.client.get(key);
      return webhook ? JSON.parse(webhook) : null;
    } catch (error) {
      console.error('Error getting webhook data:', error);
      throw error;
    }
  }

  async deleteWebhookData(webhookId) {
    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }

    const key = `webhook:${webhookId}`;
    
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Error deleting webhook data:', error);
      throw error;
    }
  }

  async createWebhook(webhookId) {
    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }

    const key = `webhook:${webhookId}`;
    const webhookData = {
      id: webhookId,
      createdAt: Date.now(),
      requests: []
    };

    try {
      await this.client.setEx(key, 86400, JSON.stringify(webhookData));
      return webhookData;
    } catch (error) {
      console.error('Error creating webhook:', error);
      throw error;
    }
  }

  // Analytics operations
  async trackWebhookUsage(webhookId) {
    if (!this.isConnected) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      await this.client.incr(`stats:webhooks:${today}`);
      await this.client.incr(`stats:requests:${webhookId}`);
    } catch (error) {
      console.error('Error tracking webhook usage:', error);
    }
  }
}

module.exports = new RedisClient();