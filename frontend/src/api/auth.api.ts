import { apiClient } from './client';
import { User } from '../types';

export interface AuthMeResponse {
  authenticated: boolean;
  user: User | null;
  googleConfigured: boolean;
}

export const authApi = {
  async getMe(): Promise<AuthMeResponse> {
    const res = await apiClient.get<AuthMeResponse>('/auth/me');
    return res.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  getGoogleLoginUrl(): string {
    return '/api/auth/google';
  },
};
