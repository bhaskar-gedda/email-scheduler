import { apiClient } from './client';
import { Email, PaginatedResponse } from '../types';

export const emailsApi = {
  async getScheduled(page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<Email>> {
    const res = await apiClient.get<PaginatedResponse<Email>>('/emails/scheduled', {
      params: { page, pageSize },
    });
    return res.data;
  },

  async getSent(page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<Email>> {
    const res = await apiClient.get<PaginatedResponse<Email>>('/emails/sent', {
      params: { page, pageSize },
    });
    return res.data;
  },

  async search(query: string, status?: string): Promise<Email[]> {
    const res = await apiClient.get<{ success: boolean; data: Email[] }>('/emails/search', {
      params: { q: query, status },
    });
    return res.data.data;
  },
};
