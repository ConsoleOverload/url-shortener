import redisClient from '../config/redis.js';

const KEY_PREFIX = 'url:';

/**
 * Cache GET wrapper with fault tolerance.
 * If Redis is disconnected, it logs the error and returns null to let the system fall back to MongoDB.
 */
export const cacheGet = async (key) => {
  try {
    if (redisClient.isOpen) {
      return await redisClient.get(`${KEY_PREFIX}${key}`);
    }
  } catch (error) {
    console.error(`Redis GET error for key ${key}:`, error.message);
  }
  return null;
};

/**
 * Cache SET wrapper with fault tolerance and TTL (default: 24 hours).
 */
export const cacheSet = async (key, value, ttlSeconds = 86400) => {
  try {
    if (redisClient.isOpen) {
      // If ttlSeconds is 0 or negative (like dynamic/no expiry), we still set a long TTL to avoid stale records persisting forever
      const finalTtl = ttlSeconds > 0 ? ttlSeconds : 86400;
      await redisClient.set(`${KEY_PREFIX}${key}`, value, {
        EX: finalTtl
      });
    }
  } catch (error) {
    console.error(`Redis SET error for key ${key}:`, error.message);
  }
};

/**
 * Cache DELETE wrapper with fault tolerance.
 */
export const cacheDelete = async (key) => {
  try {
    if (redisClient.isOpen) {
      await redisClient.del(`${KEY_PREFIX}${key}`);
    }
  } catch (error) {
    console.error(`Redis DEL error for key ${key}:`, error.message);
  }
};
