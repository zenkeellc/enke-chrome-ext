<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, defineAsyncComponent } from 'vue';
import { useAuth } from './composables/useAuth';
import { useStorage } from './composables/useStorage';
import { useI18n } from '@/i18n';
import { remember } from '@/utils/memory-api';
import LoginPage from './pages/LoginPage.vue';
import HomePage from './pages/HomePage.vue';
import ShortenPage from './pages/ShortenPage.vue';
import HistoryPage from './pages/HistoryPage.vue';
import MemoriesPage from './pages/MemoriesPage.vue';

const MarkdownEditor = defineAsyncComponent(() => import('./components/MarkdownEditor.vue'));

const { storage, init, doLogout, loggingIn, error, switchToAccount, startLogin } = useAuth();
const { userState, accounts, activeAccount, getAccounts } = useStorage();
const { t, init: initI18n } = useI18n();

type Page = 'login' | 'home' | 'shorten' | 'memories' | 'history' | 'agent-memory';

const currentPage = ref<Page>('login');
const loading = ref(true);

// Capture state
const capturedMarkdown = ref('');
const captureError = ref('');
const saving = ref(false);
const hasPendingCapture = ref(false);

// ── Pending capture type ──────────────────────────────────────

interface PendingCapture {
  markdown: string; url: string; title: string;
  hasImages: boolean; imageCount: number; capturedAt: number;
}

// ── Storage listener for right-click captures ─────────────────

let storageListener: ((changes: Record<string, chrome.storage.StorageChange>) => void) | null = null;

onMounted(async () => {
  await initI18n();

  const safetyTimer = setTimeout(() => {
    if (loading.value) { loading.value = false; currentPage.value = 'login'; }
  }, 5000);

  storageListener = (changes) => {
    const change = changes['pending_capture'];
    if (change?.newValue?.markdown) {
      const pc = change.newValue as PendingCapture;
      if (Date.now() - pc.capturedAt < 5 * 60 * 1000) {
        capturedMarkdown.value = pc.markdown;
        chrome.storage.session.remove('pending_capture').catch(() => {});
        if (userState.value.isLoggedIn) {
          currentPage.value = 'agent-memory';
        } else {
          hasPendingCapture.value = true;
        }
      }
    }
  };
  chrome.storage.onChanged.addListener(storageListener);

  try {
    const loggedIn = await init();
    currentPage.value = loggedIn ? 'home' : 'login';
    if (loggedIn) {
      loadPendingCapture();
    } else {
      checkPendingCaptureFlag();
    }
  } catch (e) {
    console.error('[en.ke] init crash:', e);
    currentPage.value = 'login';
  } finally {
    clearTimeout(safetyTimer);
    loading.value = false;
  }
});

onUnmounted(() => {
  if (storageListener) { chrome.storage.onChanged.removeListener(storageListener); storageListener = null; }
});

// ── Pending capture helpers ───────────────────────────────────

async function checkPendingCaptureFlag() {
  try {
    const r = await chrome.storage.session.get('pending_capture');
    if (r.pending_capture?.markdown && Date.now() - r.pending_capture.capturedAt < 5*60*1000) {
      hasPendingCapture.value = true;
    }
  } catch { /* ignore */ }
}

async function loadPendingCapture() {
  try {
    const r = await chrome.storage.session.get('pending_capture');
    const pc = r.pending_capture as PendingCapture | undefined;
    if (pc?.markdown && Date.now() - pc.capturedAt < 5*60*1000) {
      capturedMarkdown.value = pc.markdown;
      await chrome.storage.session.remove('pending_capture');
      currentPage.value = 'agent-memory';
    }
  } catch { /* ignore */ }
}

// ── Navigation ────────────────────────────────────────────────

function navigateTo(page: Page) {
  currentPage.value = page;
}

async function onLoginSuccess() {
  try {
    const r = await chrome.storage.session.get('pending_capture');
    const pc = r.pending_capture as PendingCapture | undefined;
    if (pc?.markdown && Date.now() - pc.capturedAt < 5*60*1000) {
      capturedMarkdown.value = pc.markdown;
      await chrome.storage.session.remove('pending_capture');
      currentPage.value = 'agent-memory';
      return;
    }
  } catch { /* ignore */ }
  currentPage.value = 'home';
}

async function handleLogout() {
  await doLogout();
  const remaining = getAccounts();
  if (remaining.length > 0) {
    await switchToAccount(remaining[0].email);
  } else {
    currentPage.value = 'login';
  }
}

async function handleSwitchAccount(email: string) {
  await switchToAccount(email);
}

async function handleAddAccount() {
  await startLogin({ addAccount: true });
}

// ── Agent memory flow ─────────────────────────────────────────

async function startAgentMemory() {
  captureError.value = '';
  capturedMarkdown.value = '';
  try {
    const resp = await chrome.runtime.sendMessage({ type: 'capture-page' });
    if (resp?.success && resp.markdown) {
      capturedMarkdown.value = resp.markdown;
      currentPage.value = 'agent-memory';
    } else {
      captureError.value = resp?.error || t.value.captureFailed;
    }
  } catch (e) {
    captureError.value = e instanceof Error ? e.message : t.value.captureFailed;
  }
}

async function handleSaveAgentMemory(content: string) {
  if (saving.value || !content.trim()) return;
  saving.value = true;
  captureError.value = '';

  // Client-side length check (defense in depth)
  const limit = planMemoryLimit.value;
  if (limit != null && content.length > limit) {
    captureError.value = t.value.planLimitExceeded;
    saving.value = false;
    return;
  }

  try {
    const token = userState.value.tokens?.token || '';
    if (!token) { captureError.value = t.value.signInRequired; saving.value = false; return; }
    await remember(token, content, {
      memory_type: 'semantic', ttl_level: 'permanent',
      metadata: { source: 'chrome-extension', captured_at: new Date().toISOString() },
    });
    await chrome.storage.session.remove('pending_capture');
    capturedMarkdown.value = '';
    currentPage.value = 'home';
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    captureError.value = (msg.includes('too_big') || msg.includes('exceeds'))
      ? t.value.planLimitExceeded
      : (msg || t.value.toastError);
  } finally {
    saving.value = false;
  }
}

function cancelAgentMemory() {
  capturedMarkdown.value = '';
  currentPage.value = 'home';
}

// ── Computed props for HeaderBar ──────────────────────────────

const accountList = computed(() => getAccounts());
const activeEmail = computed(() => activeAccount.value);

// Plan-aware content limits
const planMemoryLimit = computed(() => {
  const plan = userState.value.plan || 'hobby';
  const limits: Record<string, number | null> = {
    hobby: 30000,
    pro: 150000,
    business: 500000,
    max: 1_000_000,
  };
  return limits[plan] ?? 30000;
});
</script>

<template>
  <div class="app" v-if="!loading">
    <!-- Login -->
    <div v-if="currentPage === 'login'">
      <div v-if="hasPendingCapture" class="pending-banner">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        {{ t.pendingBanner }}
      </div>
      <LoginPage
        @login-success="onLoginSuccess"
        :loading="loggingIn"
        :error="error"
      />
    </div>

    <!-- Logged-in pages (with HeaderBar) -->
    <template v-else>
      <HeaderBar
        :plan="userState.plan"
        :user="userState.user"
        :accounts="accountList"
        :active-email="activeEmail"
        :current-page="currentPage as 'home'|'shorten'|'memories'|'history'"
        @navigate="navigateTo"
        @logout="handleLogout"
        @agent-memory="startAgentMemory"
        @switch-account="handleSwitchAccount"
        @add-account="handleAddAccount"
      />

      <HomePage
        v-if="currentPage === 'home'"
        @navigate="navigateTo"
      />
      <ShortenPage
        v-else-if="currentPage === 'shorten'"
        @navigate="navigateTo"
      />
      <MemoriesPage
        v-else-if="currentPage === 'memories'"
        @navigate="navigateTo"
      />
      <HistoryPage
        v-else-if="currentPage === 'history'"
        @navigate="navigateTo"
      />

      <!-- Agent Memory editor page -->
      <div v-else-if="currentPage === 'agent-memory'" class="capture-page">
        <div class="capture-top">
          <button class="back-btn" @click="cancelAgentMemory">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            {{ t.back }}
          </button>
          <h2 class="page-title">{{ t.agentMemory }}</h2>
          <button class="btn btn--primary save-btn" :disabled="saving || !capturedMarkdown.trim()" @click="handleSaveAgentMemory(capturedMarkdown)">
            {{ saving ? t.saving : t.saveToMemory }}
          </button>
        </div>
        <div v-if="captureError" class="capture-error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>{{ captureError }}</span>
        </div>
        <MarkdownEditor v-model="capturedMarkdown" :placeholder="t.capturePlaceholder" :max-chars="planMemoryLimit" @save="handleSaveAgentMemory" />
      </div>
    </template>
  </div>
  <div class="app app--loading" v-else>
    <div class="loading-spinner"></div>
  </div>
</template>

<style>
@import './styles/main.css';
</style>

<style scoped>
/* ── Pending banner ───────────────────── */
.pending-banner {
  display: flex; align-items: center; gap: 8px; padding: 10px 14px;
  background: var(--accent-dim); border-bottom: 1px solid var(--accent-glow);
  color: var(--accent-text); font-size: 11px; font-weight: 500;
}

/* ── Agent Memory page ────────────────── */
.capture-page { display: flex; flex-direction: column; flex: 1; }
.capture-top { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--bg-surface); border-bottom: 1px solid var(--border-subtle); }
.back-btn { display: flex; align-items: center; gap: 4px; color: var(--text-muted); background: none; border: none; font-size: 12px; cursor: pointer; border-radius: var(--radius-sm); padding: 4px; }
.back-btn:hover { color: var(--accent); }
.page-title { font-size: 14px; font-weight: 700; color: var(--text-primary); flex: 1; }
.save-btn { font-size: 11px; padding: 6px 12px; }
.capture-error { margin: 8px 12px 0; padding: 8px 10px; background: rgba(217,48,37,0.08); border: 1px solid rgba(217,48,37,0.15); border-radius: var(--radius-sm); color: var(--error); font-size: 11px; }
.capture-page :deep(.md-editor) { margin: 10px 12px; flex: 1; }
</style>
