import axiosInstance from '@/lib/axios';
import { User } from '@/types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface AuthResponse {
  user: User;
  tokens: {
    access_token: string;
    refresh_token: string;
    token_type: string;
  };
}

const AUTH_BASE = '/api/v1/auth';

const authService = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await axiosInstance.post<AuthResponse>(`${AUTH_BASE}/login`, payload);
    return data;
  },

  signup: async (payload: SignupPayload): Promise<AuthResponse> => {
    const { data } = await axiosInstance.post<AuthResponse>(`${AUTH_BASE}/signup`, payload);
    return data;
  },

  logout: async (): Promise<void> => {
    await axiosInstance.post(`${AUTH_BASE}/logout`);
  },

  getMe: async (): Promise<User> => {
    const { data } = await axiosInstance.get<User>(`${AUTH_BASE}/me`);
    return data;
  },

  refresh: async (): Promise<void> => {
    await axiosInstance.post(`${AUTH_BASE}/refresh`);
  },
};

export default authService;
