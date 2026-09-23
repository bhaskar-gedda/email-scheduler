export type EmailStatus = 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'RATE_LIMITED';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface Sender {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  active: boolean;
  createdAt: string;
}

export interface Email {
  id: string;
  campaignId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt: string | null;
  status: EmailStatus;
  failureReason: string | null;
  bullJobId: string | null;
  idempotencyKey: string;
  attempts: number;
  etherealMessageUrl: string | null;
  processingStartedAt?: string | null;
  createdAt: string;
  sender?: {
    displayName: string;
    email: string;
  };
}

export interface Campaign {
  id: string;
  userId: string;
  senderId: string;
  subject: string;
  body: string;
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  status: string;
  totalRecipients: number;
  createdAt: string;
  sender?: Sender;
}

export interface SlackStatus {
  configured: boolean;
  connected: boolean;
  teamName?: string;
  teamId?: string;
  updatedAt?: string;
}

export interface Pagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
}
