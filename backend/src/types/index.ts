export type EmailStatus = 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'RATE_LIMITED';

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: Date;
}

export interface SenderDTO {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  active: boolean;
  createdAt: Date;
}

export interface EmailDTO {
  id: string;
  campaignId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: Date;
  sentAt: Date | null;
  status: EmailStatus;
  failureReason: string | null;
  bullJobId: string | null;
  idempotencyKey: string;
  attempts: number;
  etherealMessageUrl: string | null;
  processingStartedAt?: Date | null;
  createdAt: Date;
  sender?: {
    displayName: string;
    email: string;
  };
}

export interface CampaignDTO {
  id: string;
  userId: string;
  senderId: string;
  subject: string;
  body: string;
  startTime: Date;
  delayBetweenEmails: number;
  hourlyLimit: number;
  status: string;
  totalRecipients: number;
  createdAt: Date;
  sender?: SenderDTO;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface CreateCampaignInput {
  senderId: string;
  subject: string;
  body: string;
  startTime: string; // ISO string
  delayBetweenEmails?: number;
  hourlyLimit?: number;
  recipients: string[];
}

export interface CreateSenderInput {
  email: string;
  displayName: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface SlackStatusResponse {
  connected: boolean;
  teamName?: string;
  teamId?: string;
  connectedAt?: Date;
}
