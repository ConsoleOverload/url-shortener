import { createShortUrl, resolveShortUrl } from '../services/urlService.js';
import { recordClickAsync, getAnalyticsSummary } from '../services/analyticsService.js';
import Url from '../models/Url.js';
import { AppError } from '../utils/errors.js';

/**
 * Handles creation of short URLs.
 */
export const shortenUrl = async (req, res, next) => {
  try {
    const { originalUrl, customAlias, expiresAt } = req.body;

    const newUrl = await createShortUrl({ originalUrl, customAlias, expiresAt });
    
    // Fall back to host header if BASE_URL is not set in env variables
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.headers.host}`;
    
    res.status(201).json({
      success: true,
      data: {
        shortId: newUrl.shortId,
        originalUrl: newUrl.originalUrl,
        shortUrl: `${baseUrl}/${newUrl.shortId}`,
        createdAt: newUrl.createdAt,
        expiresAt: newUrl.expiresAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Performs redirection to the original URL.
 * Records hit data asynchronously.
 */
export const redirectToUrl = async (req, res, next) => {
  try {
    const { shortId } = req.params;

    const originalUrl = await resolveShortUrl(shortId);

    if (!originalUrl) {
      throw new AppError('Short URL not found or has expired.', 404);
    }

    // Capture requester IP (supporting proxies)
    const rawIp = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
    const ip = rawIp ? rawIp.split(',')[0].trim() : '0.0.0.0';

    // Record click asynchronously (non-blocking)
    recordClickAsync({
      shortId,
      ip,
      userAgent: req.headers['user-agent'],
      referrer: req.headers['referer'] || req.headers['referrer'] || 'Direct'
    });

    // 302 redirect ensures browsers request the redirect every time, allowing us to track all clicks.
    return res.redirect(302, originalUrl);
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves analytics metrics for a given shortId.
 */
export const getAnalytics = async (req, res, next) => {
  try {
    const { shortId } = req.params;

    const urlExists = await Url.findOne({ shortId }).select('_id').lean();
    if (!urlExists) {
      throw new AppError('Short URL not found.', 404);
    }

    const summary = await getAnalyticsSummary(shortId);

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};
