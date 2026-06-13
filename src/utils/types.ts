/** Plan limits returned by /api/v1/me */
export interface PlanLimits {
  slugMinLength: number;
  bulkBatchSize: number | null;
  docFileSizeMB: number;
  docMaxExpDays: number;
  linkMaxExpirationDays: number;
  linkMaxKeepDays: number;
}

/** User profile from /api/v1/me */
export interface UserProfile {
  user_id: number;
  username: string;
  email: string;
  plan: string;
  role: string;
  subscription: SubRecord | null;
  planLimits: PlanLimits;
}

export interface SubRecord {
  stripe_sub_id: string;
  plan: string;
  interval: string;
  status: string;
  current_period_end: number;
  cancel_at_period_end: boolean;
}

/** Stored token pair */
export interface TokenPair {
  token: string;
  refreshToken: string;
  tokenExp: number;
  refreshTokenExp: number;
}

/** Recent link record stored locally */
export interface RecentLink {
  slug: string;
  shortUrl: string;
  originalUrl: string;
  createdAt: number;
}

/** Shorten API response */
export interface ShortenResponse {
  success: boolean;
  link: {
    slug: string;
    url: string;
    due_date: number;
  };
}

/** AI slug response */
export interface AISlugResponse {
  response: string;
}

/** User status stored in chrome.storage.local */
export interface UserState {
  isLoggedIn: boolean;
  user: {
    id: number;
    username: string;
    email: string;
  } | null;
  plan: string;
  role: string;
  subscription: SubRecord | null;
  slugMinLength: number;
  tokens: TokenPair;
  recentLinks: RecentLink[];
}

/** API URL constants */
export const API_URL = 'https://api.en.ke';
export const USER_API_URL = 'https://user.zenkee.com';
export const SITE_URL = 'https://www.en.ke';
