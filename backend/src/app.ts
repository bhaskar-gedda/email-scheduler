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

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled to allow Bull Board dashboard assets
    crossOriginEmbedderPolicy: false,
  })
);

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: config.FRONTEND_URL,
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

app.use(
  session({
    store: redisStore,
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
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
