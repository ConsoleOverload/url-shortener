import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for POST /shorten to prevent abuse and spamming.
 * Limits each IP to 100 requests per 15 minutes.
 */
export const shortenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: 'Too many URL shortening requests from this IP. Please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the legacy `X-RateLimit-*` headers
});

/**
 * Rate limiter for GET /:shortId redirection endpoint.
 * Permissive but protects backend from scraping and basic DoS.
 * Limits each IP to 1000 requests per 15 minutes.
 */
export const redirectLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: {
    success: false,
    error: 'Too many redirection requests from this IP. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for POST /register and POST /login auth endpoints to protect from brute force.
 * Limits each IP to 10 requests per 15 minutes.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
