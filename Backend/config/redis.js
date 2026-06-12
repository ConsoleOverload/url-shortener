import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      // In development, stop retrying after 3 attempts to avoid flooding the console log
      if (process.env.NODE_ENV !== 'production' && retries > 3) {
        console.warn('[Redis] Max reconnection attempts reached in local development. Caching is disabled.');
        return false; // stops reconnection attempts
      }
      // In production, reconnect indefinitely with an exponential backoff capped at 10 seconds
      return Math.min(retries * 1000, 10000);
    }
  }
});

redisClient.on('error', (err) => {
  // Handle ECONNREFUSED cleanly to avoid terminal spam when local Redis is absent
  if (err.code === 'ECONNREFUSED' || (err.message && err.message.includes('ECONNREFUSED'))) {
    console.warn('[Redis Status] Offline (Connection Refused at 127.0.0.1:6379). Running in database-only mode.');
    return;
  }
  console.error('[Redis Error]:', err.message || err);
});

redisClient.on('connect', () => {
  console.log('Redis client connected');
});

const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Failed to connect to Redis, falling back to database-only mode:', error.message);
  }
};

connectRedis();

export default redisClient;
