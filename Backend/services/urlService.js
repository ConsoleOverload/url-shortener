import mongoose from 'mongoose';
import { customAlphabet } from 'nanoid';
import validator from 'validator';
import Url from '../models/Url.js';
import ClickLog from '../models/Analytics.js';
import { cacheSet, cacheGet, cacheDelete } from './cacheService.js';
import { AppError } from '../utils/errors.js';

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
// 8 characters using Base62 gives 62^8 (~2.18 * 10^14) combinations, preventing collisions.
const generateShortId = customAlphabet(alphabet, 8);

// Cache Stampede Mitigation: Stores active MongoDB lookups to deduplicate simultaneous requests for the same key.
const pendingResolutions = new Map();

/**
 * Calculates remaining TTL in seconds for cache storage.
 */
const calculateTtl = (expiryDate) => {
  if (!expiryDate) return 86400; // Default cache TTL is 24 hours
  const seconds = Math.floor((expiryDate.getTime() - Date.now()) / 1000);
  return seconds > 0 ? seconds : 86400;
};

/**
 * Validates the long URL and prevents loop shortening of our own domain.
 */
export const validateUrl = (url) => {
  if (!url) return false;
  
  const isValid = validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true,
    require_valid_protocol: true,
    require_tld: false // Allows local URLs like http://localhost:8080 during testing
  });
  if (!isValid) return false;

  // Prevent infinite loops by rejecting redirection to ourselves
  try {
    const targetUrlObj = new URL(url);
    const baseUrlObj = new URL(process.env.BASE_URL || 'http://localhost:3000');
    if (targetUrlObj.hostname === baseUrlObj.hostname) {
      return false;
    }
  } catch (error) {
    return false;
  }

  return true;
};

/**
 * Core business logic to create a short URL.
 * Supports custom aliases and expiration times. Deduplicates existing non-expiring URLs.
 */
export const createShortUrl = async ({ originalUrl, customAlias, expiresAt, userId, title }) => {
  // 1. Validate format
  if (!validateUrl(originalUrl)) {
    throw new AppError('Invalid or unsupported URL format.', 400);
  }

  // 2. Handle Expiration
  let expiryDate = null;
  if (expiresAt) {
    expiryDate = new Date(expiresAt);
    if (isNaN(expiryDate.getTime())) {
      throw new AppError('Invalid expiration date format.', 400);
    }
    if (expiryDate <= new Date()) {
      throw new AppError('Expiration date must be in the future.', 400);
    }
  }

  // 3. Handle Custom Alias
  if (customAlias) {
    const aliasClean = customAlias.trim();
    if (aliasClean.length < 3 || aliasClean.length > 30) {
      throw new AppError('Custom alias must be between 3 and 30 characters.', 400);
    }
    if (!/^[a-zA-Z0-9-_]+$/.test(aliasClean)) {
      throw new AppError('Custom alias can only contain alphanumeric characters, hyphens, and underscores.', 400);
    }

    // Check availability
    const existingAlias = await Url.findOne({ shortId: aliasClean }).select('_id').lean();
    if (existingAlias) {
      throw new AppError('Custom alias is already in use.', 409);
    }

    const newUrl = await Url.create({
      shortId: aliasClean,
      originalUrl,
      expiresAt: expiryDate,
      userId: userId || null,
      title: title || null
    });

    const ttlSeconds = calculateTtl(expiryDate);
    await cacheSet(aliasClean, originalUrl, ttlSeconds);
    return newUrl;
  }

  // 4. Deduplicate (only applicable if URL does not expire and belongs to same user / anonymous)
  if (!expiryDate) {
    const existingUrl = await Url.findOne({ originalUrl, expiresAt: null, userId: userId || null }).select('shortId originalUrl').lean();
    if (existingUrl) {
      await cacheSet(existingUrl.shortId, originalUrl, 86400);
      return existingUrl;
    }
  }

  // 5. Generate collision-resistant unique ID with retries
  let shortId;
  let isUnique = false;
  let retryCount = 0;

  while (!isUnique && retryCount < 5) {
    shortId = generateShortId();
    const existing = await Url.findOne({ shortId }).select('_id').lean();
    if (!existing) {
      isUnique = true;
    }
    retryCount++;
  }

  if (!isUnique) {
    throw new AppError('Failed to generate a unique short ID due to collisions. Please try again.', 500);
  }

  // 6. Create record
  const newUrl = await Url.create({
    shortId,
    originalUrl,
    expiresAt: expiryDate,
    userId: userId || null,
    title: title || null
  });

  // 7. Write to cache
  const ttlSeconds = calculateTtl(expiryDate);
  await cacheSet(shortId, originalUrl, ttlSeconds);
  return newUrl;
};

/**
 * Resolves shortId to originalUrl.
 * Employs Cache-Aside pattern, Singleflight query grouping, and Negative Caching.
 */
export const resolveShortUrl = async (shortId) => {
  // 1. Read from Redis Cache (includes Cache Penetration filter check)
  const cachedUrl = await cacheGet(shortId);
  if (cachedUrl) {
    if (cachedUrl === '__NULL__') {
      return null; // Negative hit: URL is verified to not exist
    }
    return cachedUrl;
  }

  // 2. Cache Stampede Protection (Singleflight Pattern)
  // Reuse current in-flight lookup promise for duplicate concurrent queries
  if (pendingResolutions.has(shortId)) {
    return pendingResolutions.get(shortId);
  }

  const lookupPromise = (async () => {
    try {
      const urlRecord = await Url.findOne({ shortId }).select('originalUrl expiresAt').lean();

      if (!urlRecord) {
        // Cache penetration protection: Cache invalid query for 5 minutes
        await cacheSet(shortId, '__NULL__', 300);
        return null;
      }

      // Check if expired manually (covers window before TTL index deletion daemon runs)
      if (urlRecord.expiresAt && urlRecord.expiresAt <= new Date()) {
        await cacheSet(shortId, '__NULL__', 300);
        return null;
      }

      const ttlSeconds = calculateTtl(urlRecord.expiresAt);
      if (ttlSeconds > 0) {
        await cacheSet(shortId, urlRecord.originalUrl, ttlSeconds);
      }

      return urlRecord.originalUrl;
    } finally {
      // Ensure we clear from tracker once resolved/rejected
      pendingResolutions.delete(shortId);
    }
  })();

  pendingResolutions.set(shortId, lookupPromise);
  return lookupPromise;
};

/**
 * Retrieves all URLs associated with a userId, along with click counts.
 */
export const getUserUrls = async (userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  return await Url.aggregate([
    { $match: { userId: userObjectId } },
    {
      $lookup: {
        from: 'clicklogs', // collection name for ClickLog
        localField: 'shortId',
        foreignField: 'shortId',
        as: 'clicks'
      }
    },
    {
      $project: {
        shortId: 1,
        originalUrl: 1,
        createdAt: 1,
        expiresAt: 1,
        title: 1,
        clickCount: { $size: '$clicks' }
      }
    },
    { $sort: { createdAt: -1 } }
  ]);
};

/**
 * Deletes a URL and its analytics data for a specific user, invalidating cache.
 */
export const deleteUserUrl = async (userId, shortId) => {
  const urlRecord = await Url.findOneAndDelete({ shortId, userId });
  if (!urlRecord) {
    throw new AppError('Short URL not found or you do not have permission to delete it.', 404);
  }

  // Clean up related analytics click logs
  await ClickLog.deleteMany({ shortId });

  // Invalidate Redis cache
  await cacheDelete(shortId);
  return true;
};

/**
 * Updates the custom alias and/or title for a user's URL.
 */
export const updateUserUrlAlias = async (userId, shortId, { newAlias, newTitle }) => {
  // Find URL and check owner
  const urlRecord = await Url.findOne({ shortId, userId });
  if (!urlRecord) {
    throw new AppError('Short URL not found or you do not have permission to modify it.', 404);
  }

  // Update title if provided
  if (newTitle !== undefined) {
    urlRecord.title = newTitle.trim() || null;
  }

  // Update alias if provided and changed
  if (newAlias && newAlias.trim() !== urlRecord.shortId) {
    const aliasClean = newAlias.trim();
    if (aliasClean.length < 3 || aliasClean.length > 30) {
      throw new AppError('Custom alias must be between 3 and 30 characters.', 400);
    }
    if (!/^[a-zA-Z0-9-_]+$/.test(aliasClean)) {
      throw new AppError('Custom alias can only contain alphanumeric characters, hyphens, and underscores.', 400);
    }

    // Check availability of new alias
    const existingAlias = await Url.findOne({ shortId: aliasClean }).select('_id').lean();
    if (existingAlias) {
      throw new AppError('Custom alias is already in use.', 409);
    }

    const oldShortId = urlRecord.shortId;
    urlRecord.shortId = aliasClean;

    // Update associated analytics logs (preserve historic data)
    await ClickLog.updateMany({ shortId: oldShortId }, { shortId: aliasClean });

    // Handle cache updates: invalidate both keys
    await cacheDelete(oldShortId);
    await cacheDelete(aliasClean);

    const ttlSeconds = calculateTtl(urlRecord.expiresAt);
    await cacheSet(aliasClean, urlRecord.originalUrl, ttlSeconds);
  }

  await urlRecord.save();
  return urlRecord;
};
