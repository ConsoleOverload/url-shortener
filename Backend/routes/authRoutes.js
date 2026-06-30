import { Router } from 'express';
import { register, login } from '../controllers/authController.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Route for registration (rate limited)
router.post('/register', authLimiter, register);

// Route for login (rate limited)
router.post('/login', authLimiter, login);

export default router;
