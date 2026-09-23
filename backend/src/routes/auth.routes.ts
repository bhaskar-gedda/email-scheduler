import { Router } from 'express';
import { authController } from '../controllers/auth.controller';

const router = Router();

// Redirect to Google OAuth consent
router.get('/google', (req, res) => authController.googleLogin(req, res));

// Google OAuth callback
router.get('/google/callback', (req, res, next) =>
  authController.googleCallback(req, res, next)
);

// Get current session user (works even if unauthenticated)
router.get('/me', (req, res, next) => authController.getMe(req, res, next));

// Logout
router.post('/logout', (req, res) => authController.logout(req, res));

export const authRoutes = router;
