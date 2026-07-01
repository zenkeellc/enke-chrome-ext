<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useShorten } from '../composables/useShorten';
import { useStorage } from '../composables/useStorage';
import { useI18n } from '@/i18n';
import { checkSlug } from '@/utils/api';
import LinkResult from '../components/LinkResult.vue';
import RecentList from '../components/RecentList.vue';

const emit = defineEmits<{
  navigate: [page: 'home' | 'shorten' | 'memories' | 'history'];
}>();

const { userState } = useStorage();
const { t } = useI18n();

const { shortening, result, error, aiLoading, shorten, suggestSlug, reset } = useShorten();

const url = ref('');
const slug = ref('');
const copied = ref(false);

const PLAN_NAMES: Record<string, string> = { hobby: 'Hobby', pro: 'Pro', business: 'Business', max: 'Max' };

// Slug validation
const slugStatus = ref<'idle' | 'checking' | 'valid' | 'invalid' | 'taken'>('idle');
let slugTimer: ReturnType<typeof setTimeout> | null = null;

const slugMinLen = computed(() => userState.value.slugMinLength ?? 8);

const slugFormatOk = computed(() => {
  const s = slug.value.trim();
  if (!s) return true; // empty = backend generates one
  return /^[a-zA-Z0-9-]+$/.test(s) && s.length >= slugMinLen.value;
});

const slugError = computed(() => {
  const s = slug.value.trim();
  if (!s) return '';
  if (!/^[a-zA-Z0-9-]+$/.test(s)) return 'Only letters, numbers, hyphens';
  if (s.length < slugMinLen.value) return `Min ${slugMinLen.value} characters`;
  if (slugStatus.value === 'taken') return 'Already taken';
  if (slugStatus.value === 'invalid') return 'Reserved or invalid';
  return '';
});

const canShorten = computed(() => {
  if (!url.value.trim()) return false;
  if (shortening.value) return false;
  const s = slug.value.trim();
  if (!s) return true; // no slug = backend auto-generates
  if (!slugFormatOk.value) return false;
  if (slugStatus.value === 'taken' || slugStatus.value === 'invalid') return false;
  return true;
});

// Debounced availability check
watch(() => slug.value, (val) => {
  if (slugTimer) clearTimeout(slugTimer);
  const s = val.trim();
  if (!s || !slugFormatOk.value) {
    slugStatus.value = s ? 'invalid' : 'idle';
    return;
  }
  slugStatus.value = 'checking';
  slugTimer = setTimeout(async () => {
    try {
      const result = await checkSlug(s);
      slugStatus.value = result.available ? 'valid' : (result.reason === 'taken' ? 'taken' : 'invalid');
    } catch {
      slugStatus.value = 'idle'; // network error, let backend decide
    }
  }, 400);
});
const planLabel = computed(() => PLAN_NAMES[userState.value.plan] || userState.value.plan || 'Hobby');
const recentLinks = computed(() => userState.value.recentLinks || []);

onMounted(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      url.value = tab.url;
    }
  } catch { /* no tab access */ }
});

async function handleShorten() {
  if (!url.value.trim() || shortening.value) return;
  const ok = await shorten(url.value.trim(), slug.value.trim() || undefined);
  if (ok) copied.value = false;
}

async function handleSuggest() {
  if (!url.value.trim() || aiLoading.value) return;
  const suggestion = await suggestSlug(url.value.trim());
  if (suggestion) slug.value = suggestion;
}

function handleCopy(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    copied.value = true;
    setTimeout(() => (copied.value = false), 1800);
  });
}

function openDashboard() {
  chrome.tabs.create({ url: 'https://www.en.ke/console/links' });
}

function handleReset() {
  reset();
  url.value = '';
  slug.value = '';
  copied.value = false;
  chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
    if (tab?.url && !tab.url.startsWith('chrome://')) url.value = tab.url;
  });
}
</script>

<template>
  <div class="shorten-page">
    <!-- Top bar -->
    <div class="page-top-bar">
      <button class="back-btn" @click="emit('navigate', 'home')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
      </button>
      <h2 class="page-title">{{ t.shorten }}</h2>
    </div>

    <!-- Input state -->
    <div v-if="!result" class="body-area">
      <div class="field-group">
        <label class="field-label">URL</label>
        <input
          v-model="url"
          type="url"
          class="input-field"
          placeholder="https://example.com/your-long-url…"
          autofocus
          @keyup.enter="handleShorten"
        />
      </div>

      <div class="field-group">
        <label class="field-label">
          Slug
          <span class="field-hint">
            · min {{ slugMinLen }} chars · {{ planLabel }}
            <span v-if="slugStatus === 'checking'" class="slug-status slug-checking">checking…</span>
            <span v-else-if="slugStatus === 'valid'" class="slug-status slug-ok">available</span>
            <span v-else-if="slugStatus === 'taken'" class="slug-status slug-bad">taken</span>
            <span v-else-if="slugError" class="slug-status slug-bad">{{ slugError }}</span>
          </span>
        </label>
        <div class="slug-input-row">
          <span class="slug-domain">en.ke/</span>
          <input
            v-model="slug"
            type="text"
            class="input-field slug-field"
            placeholder="custom-slug"
            :maxlength="32"
          />
          <button class="ai-btn" :disabled="aiLoading" @click="handleSuggest" title="AI suggest slug">
            <svg v-if="!aiLoading" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            <span v-else class="ai-dot"></span>
          </button>
        </div>
      </div>

      <button
        class="btn btn--primary shorten-btn"
        :disabled="!canShorten"
        @click="handleShorten"
      >
        {{ shortening ? 'Creating…' : 'Shorten' }}
      </button>

      <div v-if="error" class="error-toast">
        <span class="error-toast-text">{{ error }}</span>
        <button class="error-toast-close" @click="error = ''">&times;</button>
      </div>

      <RecentList v-if="recentLinks.length" :links="recentLinks" />

      <button v-if="recentLinks.length" class="view-all" @click="openDashboard">
        View all links
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </button>
    </div>

    <!-- Result state -->
    <div v-else class="body-area">
      <LinkResult
        :short-url="'https://en.ke/' + result.link.slug"
        :original-url="result.link.url"
        :slug="result.link.slug"
        :copied="copied"
        @copy="handleCopy('https://en.ke/' + result.link.slug)"
      />

      <button class="btn btn--ghost another-btn" @click="handleReset">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        New Link
      </button>
    </div>
  </div>
</template>

<style scoped>
.shorten-page {
  display: flex;
  flex-direction: column;
  flex: 1;
}

/* ── Top bar ──────────────────────────── */
.page-top-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; background: var(--bg-base);
  border-bottom: 1px solid var(--border-subtle);
}
.back-btn {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border: none; border-radius: var(--radius-sm);
  background: transparent; color: var(--text-muted); cursor: pointer;
}
.back-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.page-title { font-size: 14px; font-weight: 700; color: var(--text-primary); flex: 1; }

.body-area {
  padding: 14px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.field-group {
  margin-bottom: 10px;
}

.field-label {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 5px;
}

.field-hint {
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0.01em;
  color: var(--text-secondary);
}

/* ── Slug row — unified height ──────────── */
.slug-input-row {
  display: flex;
  align-items: stretch;
}

.slug-domain {
  display: flex;
  align-items: center;
  padding: 0 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-right: none;
  border-radius: var(--radius-md) 0 0 var(--radius-md);
  font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}

.slug-field {
  border-radius: 0 !important;
  border-left: none !important;
  border-right: none !important;
  flex: 1;
  min-width: 0;
}

/* Glow the entire row when slug input is focused */
.slug-input-row:focus-within .slug-domain,
.slug-input-row:focus-within .slug-field,
.slug-input-row:focus-within .ai-btn {
  border-color: var(--accent);
}

.slug-input-row:focus-within .slug-domain {
  box-shadow: 3px 0 8px var(--accent-dim);
}

.slug-input-row:focus-within .ai-btn {
  box-shadow: -3px 0 8px var(--accent-dim);
}

.slug-input-row:focus-within .slug-field {
  box-shadow: 0 0 0 2px var(--accent-dim);
}

.ai-btn {
  flex-shrink: 0;
  width: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-left: none;
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  color: var(--violet);
  cursor: pointer;
  transition: all 0.2s var(--ease-out);
}

.ai-btn:hover:not(:disabled) {
  background: var(--violet-glow);
}

.ai-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.ai-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--violet);
  animation: pulse 0.8s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.7); }
}

.shorten-btn {
  margin: 4px 0 8px;
}

.error-text {
  color: var(--error);
  font-size: 11px;
  margin: 4px 0;
  text-align: center;
}

.error-toast {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  margin: 8px 0 0;
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.25);
  border-radius: var(--radius-md);
  animation: fadeInUp 0.25s var(--ease-out);
}

.error-toast-text {
  flex: 1;
  color: var(--error);
  font-size: 11px;
  line-height: 1.4;
  word-break: break-word;
}

.error-toast-close {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(248, 113, 113, 0.15);
  color: var(--error);
  border-radius: 4px;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.error-toast-close:hover {
  background: rgba(248, 113, 113, 0.3);
}

.another-btn {
  margin-top: 12px;
  font-size: 12px;
  padding: 9px;
  color: var(--text-secondary);
}

.another-btn:hover { color: var(--accent); }

.view-all {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 100%;
  padding: 8px;
  margin-top: 8px;
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.view-all:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-dim);
}

.slug-status {
  font-weight: 600;
  font-size: 10px;
}

.slug-checking { color: var(--text-muted); }
.slug-ok       { color: var(--success); }
.slug-bad      { color: var(--error); }
</style>
