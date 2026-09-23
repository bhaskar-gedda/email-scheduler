import { apiClient } from './client';

export interface CreateCampaignPayload {
  senderId: string;
  subject: string;
  body: string;
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  recipients: string[];
}

export interface PreviewLeadsResponse {
  validEmails: string[];
  invalidEntries: string[];
  totalDuplicates: number;
  validCount: number;
  invalidCount: number;
}

export const campaignsApi = {
  async previewLeadsFile(file: File): Promise<PreviewLeadsResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<{ success: boolean; data: PreviewLeadsResponse }>(
      '/campaigns/preview-leads',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return res.data.data;
  },

  async previewLeadsText(content: string): Promise<PreviewLeadsResponse> {
    const res = await apiClient.post<{ success: boolean; data: PreviewLeadsResponse }>(
      '/campaigns/preview-leads',
      { content }
    );
    return res.data.data;
  },

  async create(payload: CreateCampaignPayload): Promise<{ totalScheduled: number }> {
    const res = await apiClient.post<{
      success: boolean;
      message: string;
      data: { totalScheduled: number };
    }>('/campaigns', payload);
    return res.data.data;
  },
};
