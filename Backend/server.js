import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import urlRoutes from './routes/urlRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userUrlRoutes from './routes/userUrlRoutes.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { errorHandler } from './middleware/errorHandler.js';

// Load environment configurations
dotenv.config();

// Establish MongoDB connection
connectDB();

const app = express();

/**
 * Trust Proxy:
 * Enabled for rate limiting and geolocation tracking when deployed behind reverse proxies like Render
 * Configures Express to trust headers like X-Forwarded-For.
 */
app.set('trust proxy', 1);

// HTTP Security headers
app.use(helmet());

// CORS settings
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['*'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Request payload parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Morgan request logger
const logStyle = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(logStyle));

// Standard Health Check (for uptime monitoring and container probes)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Mount Auth and SaaS URL routes
app.use('/api/auth', authRoutes);
app.use('/api/urls', authMiddleware, userUrlRoutes);

// Mount public URL and Redirect routes
app.use('/', urlRoutes);

// Fallback for unmatched routes
app.use((req, res, next) => {
  res.status(404).json({ success: false, error: 'Resource not found' });
});

// Centralized error recovery handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Server] Online in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
