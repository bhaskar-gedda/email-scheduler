import { Request, Response, NextFunction } from 'express';
import { prisma } from '../models/prisma';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        avatarUrl: string | null;
      };
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = req.session?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in with Google.',
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({
        success: false,
        message: 'User session expired or invalid.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
