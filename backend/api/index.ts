/**
 * Vercel Serverless Entry Point
 *
 * This file exports the Express app for Vercel's serverless runtime.
 * The BullMQ worker runs separately (not on Vercel).
 * Prisma and Redis connections are initialised lazily per cold start.
 */
import { app } from '../src/app';

export default app;
