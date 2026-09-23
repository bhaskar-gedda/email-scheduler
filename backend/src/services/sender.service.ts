import { prisma } from '../models/prisma';
import { CreateSenderInput, SenderDTO } from '../types';

export class SenderService {
  public async getSendersForUser(userId: string): Promise<SenderDTO[]> {
    const senders = await prisma.sender.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return senders.map((s) => ({
      id: s.id,
      userId: s.userId,
      email: s.email,
      displayName: s.displayName,
      smtpHost: s.smtpHost,
      smtpPort: s.smtpPort,
      smtpUser: s.smtpUser,
      active: s.active,
      createdAt: s.createdAt,
    }));
  }

  public async createSender(userId: string, input: CreateSenderInput): Promise<SenderDTO> {
    const sender = await prisma.sender.create({
      data: {
        userId,
        email: input.email.trim().toLowerCase(),
        displayName: input.displayName.trim(),
        smtpHost: input.smtpHost.trim(),
        smtpPort: input.smtpPort || 587,
        smtpUser: input.smtpUser?.trim() || '',
        smtpPassword: input.smtpPassword || '',
        active: true,
      },
    });

    return {
      id: sender.id,
      userId: sender.userId,
      email: sender.email,
      displayName: sender.displayName,
      smtpHost: sender.smtpHost,
      smtpPort: sender.smtpPort,
      smtpUser: sender.smtpUser,
      active: sender.active,
      createdAt: sender.createdAt,
    };
  }

  public async getSenderById(senderId: string, userId: string) {
    return prisma.sender.findFirst({
      where: { id: senderId, userId },
    });
  }
}

export const senderService = new SenderService();
