import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { redis } from './queues/redis.client';
import { config } from './config/env';
import { apiRoutes } from './routes';
import { bullBoardRouter, bullBoardAuth } from './middleware/bullboard.middleware';
import { errorHandler } from './middleware/error.middleware';

export const app = express();

// Trust reverse proxy (Render / Cloudflare / Load Balancers) for secure cookies
app.set('trust proxy', 1);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled to allow Bull Board dashboard assets
    crossOriginEmbedderPolicy: false,
  })
);

// Cross-Origin Resource Sharing (strip trailing slashes from FRONTEND_URL if any)
const allowedOrigins = [
  config.FRONTEND_URL,
  config.FRONTEND_URL.replace(/\/$/, ''),
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow request for frontend credentials fallback
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Redis-backed Session Store
const redisStore = new RedisStore({
  client: redis,
  prefix: 'sess:',
});

const isProduction = config.NODE_ENV === 'production';

app.use(
  session({
    store: redisStore,
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// Bull Board Queue Dashboard
app.use('/admin/queues', bullBoardAuth, bullBoardRouter);

// Main API Endpoints
app.use('/api', apiRoutes);

// Global Error Handler
app.use(errorHandler);
