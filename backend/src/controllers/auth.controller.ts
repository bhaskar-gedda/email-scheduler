import { Request, Response, NextFunction } from 'express';
import { googleOAuthService } from '../integrations/google/google-oauth.service';
import { authService } from '../services/auth.service';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { prisma } from '../models/prisma';

export class AuthController {
  /**
   * Redirects user to Google OAuth consent screen.
   * If credentials are missing, returns an explicit configuration error.
   */
  public googleLogin(req: Request, res: Response) {
    if (!googleOAuthService.isConfigured()) {
      return res.status(400).json({
        success: false,
        message:
          'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file to enable authentication.',
        configured: false,
      });
    }

    try {
      const url = googleOAuthService.getAuthUrl();
      res.redirect(url);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to initialize Google OAuth',
      });
    }
  }

  /**
   * Handles callback from Google OAuth.
   */
  public async googleCallback(req: Request, res: Response, next: NextFunction) {
    const code = req.query.code as string;
    const error = req.query.error as string;

    if (error) {
      logger.warn({ error }, 'Google OAuth returned an error parameter');
      return res.redirect(`${config.FRONTEND_URL}/login?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return res.redirect(`${config.FRONTEND_URL}/login?error=missing_authorization_code`);
    }

    try {
      logger.info('Google callback reached');
      const profile = await googleOAuthService.getUserFromCode(code);
      const user = await authService.handleGoogleLogin(profile);
      logger.info({ email: user.email }, 'Google user authenticated');

      // Establish secure session
      req.session.userId = user.id;

      req.session.save((err) => {
        if (err) {
          logger.error({ err }, 'Failed to save session after Google OAuth');
          return res.redirect(`${config.FRONTEND_URL}/login?error=session_error`);
        }
        logger.info({ userId: user.id }, 'Session created');
        logger.info({ targetUrl: `${config.FRONTEND_URL}/dashboard` }, 'Redirecting to dashboard');
        res.redirect(`${config.FRONTEND_URL}/dashboard`);
      });
    } catch (err: any) {
      logger.error({ err: err?.message || err }, 'Google OAuth callback exchange failed');
      res.redirect(
        `${config.FRONTEND_URL}/login?error=${encodeURIComponent(err?.message || 'oauth_failed')}`
      );
    }
  }

  /**
   * Returns currently authenticated user and system OAuth configuration status.
   */
  public async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const googleConfigured = googleOAuthService.isConfigured();

      if (!req.session?.userId) {
        return res.json({
          authenticated: false,
          user: null,
          googleConfigured,
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.session.userId },
        select: { id: true, email: true, name: true, avatarUrl: true },
      });

      if (!user) {
        return res.json({
          authenticated: false,
          user: null,
          googleConfigured,
        });
      }

      res.json({
        authenticated: true,
        user,
        googleConfigured,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Terminates the user session and clears the session cookie.
   */
  public logout(req: Request, res: Response) {
    req.session.destroy((err) => {
      if (err) {
        logger.error({ err }, 'Error destroying session');
        return res.status(500).json({ success: false, message: 'Failed to log out' });
      }
      res.clearCookie('connect.sid');
      res.json({ success: true, message: 'Logged out successfully' });
    });
  }
}

export const authController = new AuthController();
