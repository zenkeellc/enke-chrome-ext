import { ref, type Ref } from 'vue';
import type { UserState, TokenPair, RecentLink, UserProfile } from '@/utils/types';

const USER_STATE_KEY = 'enke_user_state';

function initialState(): UserState {
  return {
    isLoggedIn: false,
    user: null,
    plan: 'hobby',
    role: 'user',
    subscription: null,
    slugMinLength: 8, // hobby default; updated from /api/v1/me planLimits
    tokens: { token: '', refreshToken: '', tokenExp: 0, refreshTokenExp: 0 },
    recentLinks: [],
  };
}

// Module-level singleton state
const ready: Ref<boolean> = ref(false);
const userState: Ref<UserState> = ref(initialState());

export function useStorage() {

  async function load(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(USER_STATE_KEY);
      const data = result[USER_STATE_KEY] as UserState | undefined;
      if (data) {
        console.log('[useStorage] loaded state, recentLinks:', (data as UserState).recentLinks);
        // Merge with defaults, enforcing correct types for critical fields
        userState.value = {
          ...initialState(),
          ...data,
          recentLinks: Array.isArray((data as UserState).recentLinks) ? (data as UserState).recentLinks : [],
          tokens: {
            ...initialState().tokens,
            ...((data as UserState).tokens || {}),
          },
        };
      }
    } catch (e) {
      console.error('Failed to load user state:', e);
    }
    ready.value = true;
  }

  async function save(): Promise<void> {
    try {
      await chrome.storage.local.set({ [USER_STATE_KEY]: userState.value });
    } catch (e) {
      console.error('Failed to save user state:', e);
    }
  }

  function getToken(): string | null {
    const tokens = userState.value.tokens;
    if (!tokens.token) return null;
    const now = Math.floor(Date.now() / 1000);
    if (now > tokens.tokenExp) return null;
    return tokens.token;
  }

  function getRefreshToken(): string | null {
    const tokens = userState.value.tokens;
    if (!tokens.refreshToken) return null;
    const now = Math.floor(Date.now() / 1000);
    if (now > tokens.refreshTokenExp) return null;
    return tokens.refreshToken;
  }

  function setTokens(token: string, refreshToken: string, tokenExp: number, refreshTokenExp: number): void {
    userState.value.tokens = { token, refreshToken, tokenExp, refreshTokenExp };
    userState.value.isLoggedIn = true;
  }

  function setProfile(profile: UserProfile): void {
    userState.value.user = {
      id: profile.user_id,
      username: profile.username,
      email: profile.email,
    };
    userState.value.plan = profile.plan;
    userState.value.role = profile.role;
    userState.value.subscription = profile.subscription;
    userState.value.slugMinLength = profile.planLimits?.slugMinLength ?? 8;
  }

  function addRecentLink(link: RecentLink): void {
    let links = userState.value.recentLinks;
    if (!Array.isArray(links)) links = [];
    const filtered = links.filter((l) => l.slug !== link.slug);
    filtered.unshift(link);
    userState.value.recentLinks = filtered.slice(0, 10);
    // Auto-save
    save();
  }

  function clearState(): void {
    userState.value = initialState();
  }

  return {
    ready,
    userState,
    load,
    save,
    getToken,
    getRefreshToken,
    setTokens,
    setProfile,
    addRecentLink,
    clearState,
  };
}
