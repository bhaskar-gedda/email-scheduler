import { prisma } from '../models/prisma';
import { GoogleUserProfile } from '../integrations/google/google-oauth.service';
import { logger } from '../config/logger';

export class AuthService {
  /**
   * Finds or creates a user from Google OAuth profile.
   * If new user, creates a default starter sender for immediate testing.
   */
  public async handleGoogleLogin(profile: GoogleUserProfile) {
    let user = await prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });

    if (!user) {
      // Check if user exists with the same email
      user = await prisma.user.findUnique({
        where: { email: profile.email },
      });

      if (user) {
        // Link googleId
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: profile.googleId,
            name: profile.name,
            avatarUrl: profile.avatarUrl,
          },
        });
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            googleId: profile.googleId,
            email: profile.email,
            name: profile.name,
            avatarUrl: profile.avatarUrl,
          },
        });

        // Seed a default sender so user can immediately schedule emails
        await prisma.sender.create({
          data: {
            userId: user.id,
            email: profile.email,
            displayName: profile.name,
            smtpHost: 'smtp.ethereal.email',
            smtpPort: 587,
            smtpUser: '',
            smtpPassword: '',
            active: true,
          },
        });

        logger.info({ userId: user.id, email: user.email }, 'Created new user and initial sender');
      }
    } else {
      // Update name/avatar if changed
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: profile.name,
          avatarUrl: profile.avatarUrl,
        },
      });
    }

    return user;
  }

  public async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  }
}

export const authService = new AuthService();
