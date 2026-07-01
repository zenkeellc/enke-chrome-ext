import { ref, computed, type Ref, type ComputedRef } from 'vue';
import type { UserState, TokenPair, RecentLink, UserProfile } from '@/utils/types';

const OLD_KEY = 'enke_user_state';
const ACCOUNTS_KEY = 'enke_accounts';
const ACTIVE_KEY = 'enke_active_account';

type AccountsMap = Record<string, UserState>;

function initialState(): UserState {
  return {
    isLoggedIn: false,
    user: null,
    plan: 'hobby',
    role: 'user',
    subscription: null,
    slugMinLength: 8,
    tokens: { token: '', refreshToken: '', tokenExp: 0, refreshTokenExp: 0 },
    recentLinks: [],
  };
}

// Module-level state
const ready: Ref<boolean> = ref(false);
const accounts: Ref<AccountsMap> = ref({});
const activeAccount: Ref<string> = ref('');

/** Derived: current user state from active account */
const userState: ComputedRef<UserState> = computed(() => {
  if (!activeAccount.value || !accounts.value[activeAccount.value]) {
    return initialState();
  }
  return accounts.value[activeAccount.value];
});

// ── Migration from old single-account format ──────────────────

async function migrateIfNeeded(): Promise<void> {
  try {
    const oldResult = await chrome.storage.local.get(OLD_KEY);
    const oldData = oldResult[OLD_KEY] as UserState | undefined;
    if (oldData?.isLoggedIn && oldData?.user?.email) {
      // Check if new format already exists
      const existing = await chrome.storage.local.get(ACCOUNTS_KEY);
      if (!existing[ACCOUNTS_KEY]) {
        const email = oldData.user.email;
        const map: AccountsMap = { [email]: oldData };
        await chrome.storage.local.set({
          [ACCOUNTS_KEY]: map,
          [ACTIVE_KEY]: email,
        });
        // Remove old key
        await chrome.storage.local.remove(OLD_KEY);
        console.log('[useStorage] Migrated single account → multi-account:', email);
      }
    }
  } catch (e) {
    console.error('[useStorage] Migration failed:', e);
  }
}

// ── Load / Save ───────────────────────────────────────────────

async function loadWithCache(): Promise<void> {
  try {
    await migrateIfNeeded();

    const hasSession = !!(chrome?.storage?.session);

    // 1) Try session cache first
    if (hasSession) {
      try {
        const [sessionAccts, sessionActive] = await Promise.all([
          chrome.storage.session.get(ACCOUNTS_KEY),
          chrome.storage.session.get(ACTIVE_KEY),
        ]);
        const accts = sessionAccts[ACCOUNTS_KEY] as AccountsMap | undefined;
        const active = sessionActive[ACTIVE_KEY] as string | undefined;
        if (accts && active && accts[active]?.isLoggedIn) {
          accounts.value = accts;
          activeAccount.value = active;
          ready.value = true;
          // Background refresh from local
          refreshFromLocal(hasSession);
          return;
        }
      } catch { /* fall through */ }
    }

    // 2) Load from local storage
    const [localAccts, localActive] = await Promise.all([
      chrome.storage.local.get(ACCOUNTS_KEY),
      chrome.storage.local.get(ACTIVE_KEY),
    ]);
    const accts = localAccts[ACCOUNTS_KEY] as AccountsMap | undefined;
    const active = localActive[ACTIVE_KEY] as string | undefined;
    if (accts && active) {
      accounts.value = accts;
      activeAccount.value = active;
      // Populate session cache
      if (hasSession) {
        chrome.storage.session.set({ [ACCOUNTS_KEY]: accts, [ACTIVE_KEY]: active }).catch(() => {});
      }
    }
  } catch (e) {
    console.error('[useStorage] loadWithCache failed:', e);
  }
  ready.value = true;
}

async function refreshFromLocal(hasSession: boolean): Promise<void> {
  try {
    const [localAccts, localActive] = await Promise.all([
      chrome.storage.local.get(ACCOUNTS_KEY),
      chrome.storage.local.get(ACTIVE_KEY),
    ]);
    const accts = localAccts[ACCOUNTS_KEY] as AccountsMap | undefined;
    const active = localActive[ACTIVE_KEY] as string | undefined;
    if (accts && active) {
      accounts.value = accts;
      activeAccount.value = active;
      if (hasSession) {
        chrome.storage.session.set({ [ACCOUNTS_KEY]: accts, [ACTIVE_KEY]: active }).catch(() => {});
      }
    }
  } catch { /* ignore */ }
}

async function persist(): Promise<void> {
  const hasSession = !!(chrome?.storage?.session);
  const writes: Promise<unknown>[] = [
    chrome.storage.local.set({
      [ACCOUNTS_KEY]: accounts.value,
      [ACTIVE_KEY]: activeAccount.value,
    }),
  ];
  if (hasSession) {
    writes.push(chrome.storage.session.set({
      [ACCOUNTS_KEY]: accounts.value,
      [ACTIVE_KEY]: activeAccount.value,
    }));
  }
  await Promise.all(writes);
}

// ── Account operations ────────────────────────────────────────

function getAccounts(): { email: string; user: NonNullable<UserState['user']>; plan: string }[] {
  return Object.entries(accounts.value)
    .filter(([, s]) => s.isLoggedIn && s.user)
    .map(([email, s]) => ({
      email,
      user: s.user!,
      plan: s.plan || 'hobby',
    }));
}

function getActiveEmail(): string {
  return activeAccount.value;
}

async function addAccount(state: UserState): Promise<void> {
  if (!state.user?.email) return;
  const email = state.user.email;
  accounts.value = { ...accounts.value, [email]: state };
  activeAccount.value = email;
  await persist();
}

async function switchAccount(email: string): Promise<void> {
  if (!accounts.value[email]) return;
  activeAccount.value = email;
  await persist();
}

async function removeAccount(email: string): Promise<void> {
  const next = { ...accounts.value };
  delete next[email];
  accounts.value = next;

  // Switch to another account if removing the active one
  if (activeAccount.value === email) {
    const remaining = Object.keys(next).filter(k => next[k]?.isLoggedIn);
    activeAccount.value = remaining[0] || '';
  }

  // If no accounts left, clear everything
  if (Object.keys(next).length === 0) {
    activeAccount.value = '';
    accounts.value = {};
    await Promise.all([
      chrome.storage.local.remove(ACCOUNTS_KEY),
      chrome.storage.local.remove(ACTIVE_KEY),
      chrome.storage.session.remove(ACCOUNTS_KEY),
      chrome.storage.session.remove(ACTIVE_KEY),
    ]);
    return;
  }

  await persist();
}

async function clearAll(): Promise<void> {
  accounts.value = {};
  activeAccount.value = '';
  await Promise.all([
    chrome.storage.local.remove(ACCOUNTS_KEY),
    chrome.storage.local.remove(ACTIVE_KEY),
    chrome.storage.session.remove(ACCOUNTS_KEY),
    chrome.storage.session.remove(ACTIVE_KEY),
  ]);
}

// ── Token helpers (operate on derived userState) ──────────────

function getToken(): string | null {
  const s = userState.value;
  if (!s.tokens.token) return null;
  const now = Math.floor(Date.now() / 1000);
  if (now > s.tokens.tokenExp) return null;
  return s.tokens.token;
}

function getRefreshToken(): string | null {
  const s = userState.value;
  if (!s.tokens.refreshToken) return null;
  const now = Math.floor(Date.now() / 1000);
  if (now > s.tokens.refreshTokenExp) return null;
  return s.tokens.refreshToken;
}

function setTokens(token: string, refreshToken: string, tokenExp: number, refreshTokenExp: number): void {
  const email = activeAccount.value;
  if (!email || !accounts.value[email]) return;
  accounts.value = {
    ...accounts.value,
    [email]: {
      ...accounts.value[email],
      tokens: { token, refreshToken, tokenExp, refreshTokenExp },
      isLoggedIn: true,
    },
  };
}

function setProfile(profile: UserProfile): void {
  const email = activeAccount.value;
  if (!email || !accounts.value[email]) return;
  accounts.value = {
    ...accounts.value,
    [email]: {
      ...accounts.value[email],
      user: { id: profile.user_id, username: profile.username, email: profile.email },
      plan: profile.plan,
      role: profile.role,
      subscription: profile.subscription,
      slugMinLength: profile.planLimits?.slugMinLength ?? 8,
    },
  };
}

function addRecentLink(link: RecentLink): void {
  const email = activeAccount.value;
  if (!email || !accounts.value[email]) return;
  let links = accounts.value[email].recentLinks;
  if (!Array.isArray(links)) links = [];
  const filtered = links.filter((l) => l.slug !== link.slug);
  filtered.unshift(link);
  accounts.value = {
    ...accounts.value,
    [email]: { ...accounts.value[email], recentLinks: filtered.slice(0, 10) },
  };
  persist();
}

// ── Legacy wrappers for backward compat ───────────────────────

async function load(): Promise<void> {
  await loadWithCache();
}

async function save(): Promise<void> {
  await persist();
}

async function saveWithCache(): Promise<void> {
  await persist();
}

function clearState(): void {
  // Clear only current account
  const email = activeAccount.value;
  if (email && accounts.value[email]) {
    accounts.value = {
      ...accounts.value,
      [email]: initialState(),
    };
  }
}

// ── Export ────────────────────────────────────────────────────

export function useStorage() {
  return {
    ready,
    userState,
    accounts,
    activeAccount,
    load,
    loadWithCache,
    save,
    saveWithCache,
    getToken,
    getRefreshToken,
    setTokens,
    setProfile,
    addRecentLink,
    clearState,
    // Multi-account
    getAccounts,
    getActiveEmail,
    addAccount,
    switchAccount,
    removeAccount,
    clearAll,
  };
}
