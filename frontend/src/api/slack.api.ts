import { apiClient } from './client';
import { SlackStatus } from '../types';

export const slackApi = {
  async getStatus(): Promise<SlackStatus> {
    const res = await apiClient.get<{ success: boolean; data: SlackStatus }>('/slack/status');
    return res.data.data;
  },

  async disconnect(): Promise<void> {
    await apiClient.post('/slack/disconnect');
  },

  getConnectUrl(): string {
    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    return `${baseUrl}/slack/connect`;
  },
};
