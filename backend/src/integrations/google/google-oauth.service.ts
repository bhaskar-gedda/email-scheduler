import { OAuth2Client } from 'google-auth-library';
import { config } from '../../config/env';
import { logger } from '../../config/logger';

export interface GoogleUserProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export class GoogleOAuthService {
  private client: OAuth2Client | null = null;

  constructor() {
    if (this.isConfigured()) {
      this.client = new OAuth2Client(
        config.GOOGLE_CLIENT_ID,
        config.GOOGLE_CLIENT_SECRET,
        config.GOOGLE_CALLBACK_URL
      );
    }
  }

  public isConfigured(): boolean {
    return Boolean(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET);
  }

  /**
   * Generates real Google OAuth 2.0 authorization URL.
   */
  public getAuthUrl(): string {
    if (!this.client) {
      throw new Error(
        'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env'
      );
    }

    return this.client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
    });
  }

  /**
   * Exchanges Google OAuth authorization code for verified user profile.
   */
  public async getUserFromCode(code: string): Promise<GoogleUserProfile> {
    if (!this.client) {
      throw new Error('Google OAuth is not configured');
    }

    const { tokens } = await this.client.getToken(code);
    this.client.setCredentials(tokens);

    if (!tokens.id_token) {
      throw new Error('No ID token returned by Google OAuth');
    }

    const ticket = await this.client.verifyIdToken({
      idToken: tokens.id_token,
      audience: config.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      throw new Error('Invalid Google profile payload received');
    }

    logger.info({ email: payload.email }, 'Successfully authenticated user via Google OAuth');

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      avatarUrl: payload.picture || null,
    };
  }
}

export const googleOAuthService = new GoogleOAuthService();
