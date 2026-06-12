import { Router } from 'express';
import { shortenUrl, redirectToUrl, getAnalytics } from '../controllers/urlController.js';
import { shortenLimiter, redirectLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Endpoint to shorten a URL (rate limited)
router.post('/shorten', shortenLimiter, shortenUrl);

// Endpoint to fetch url statistics
router.get('/analytics/:shortId', getAnalytics);

// Redirection endpoint (rate limited)
router.get('/:shortId', redirectLimiter, redirectToUrl);

export default router;
