import { apiClient } from './client';
import { Sender } from '../types';

export interface CreateSenderPayload {
  email: string;
  displayName: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser?: string;
  smtpPassword?: string;
}

export const sendersApi = {
  async list(): Promise<Sender[]> {
    const res = await apiClient.get<{ success: boolean; data: Sender[] }>('/senders');
    return res.data.data;
  },

  async create(payload: CreateSenderPayload): Promise<Sender> {
    const res = await apiClient.post<{ success: boolean; data: Sender }>('/senders', payload);
    return res.data.data;
  },
};
