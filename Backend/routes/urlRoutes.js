import { Router } from 'express';
import { shortenUrl, redirectToUrl, getAnalytics } from '../controllers/urlController.js';
import { shortenLimiter, redirectLimiter } from '../middleware/rateLimiter.js';
import { optionalAuthMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// Endpoint to shorten a URL (rate limited, optional authentication)
router.post('/shorten', optionalAuthMiddleware, shortenLimiter, shortenUrl);

// Endpoint to fetch url statistics
router.get('/analytics/:shortId', getAnalytics);

// Redirection endpoint (rate limited)
router.get('/:shortId', redirectLimiter, redirectToUrl);

export default router;
