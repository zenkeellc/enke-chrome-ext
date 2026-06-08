import axios, { type AxiosResponse } from 'axios';
import { API_URL, USER_API_URL, type ShortenResponse, type UserProfile } from './types';

// ─── Token management ───────────────────────────────────────

let tokenGetter: (() => Promise<string | null>) | null = null;
let refreshTokenHandler: (() => Promise<boolean>) | null = null;
let logoutHandler: (() => Promise<void>) | null = null;

export function setTokenGetter(fn: () => Promise<string | null>): void {
  tokenGetter = fn;
}

export function setRefreshHandler(fn: () => Promise<boolean>): void {
  refreshTokenHandler = fn;
}

export function setLogoutHandler(fn: () => Promise<void>): void {
  logoutHandler = fn;
}

// ─── Axios instance ─────────────────────────────────────────

const api = axios.create({ timeout: 15000 });

api.interceptors.request.use(async (config) => {
  if (tokenGetter) {
    const token = await tokenGetter();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    // Retry once with refreshed token on 401
    if (error.response?.status === 401 && !original._retried && refreshTokenHandler) {
      original._retried = true;
      const ok = await refreshTokenHandler();
      if (ok) {
        const token = await tokenGetter?.();
        if (token) {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        }
      }
      await logoutHandler?.();
    }
    return Promise.reject(error);
  }
);

// ─── API functions ──────────────────────────────────────────

export async function getMe(): Promise<AxiosResponse<UserProfile>> {
  return api.get<UserProfile>(`${API_URL}/api/v1/me`);
}

export async function createShortLink(
  url: string,
  slug?: string,
  keepDays?: number,
): Promise<AxiosResponse<ShortenResponse>> {
  return api.post<ShortenResponse>(`${API_URL}/api/v1/links`, {
    url,
    slug: slug || undefined,
    keep_days: keepDays ?? 30,
  });
}

export async function getAISlug(url: string): Promise<AxiosResponse<{ success: boolean; result: { slug: string } }>> {
  return api.post(`${API_URL}/api/v1/links/ai-slug`, { url });
}

export async function checkSlug(slug: string): Promise<{ available: boolean; reason?: string }> {
  const res = await api.get<{ available: boolean; reason?: string }>(
    `${API_URL}/api/v1/slug-check/${encodeURIComponent(slug)}`
  );
  return res.data;
}

export async function refreshTokenApi(refreshToken: string): Promise<AxiosResponse<{
  data: { token: string; refreshToken: string };
}>> {
  return api.post(`${USER_API_URL}/api/v1/refresh`, { refreshToken });
}

export default api;
