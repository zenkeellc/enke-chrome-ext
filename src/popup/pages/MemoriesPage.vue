<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useStorage } from '../composables/useStorage';
import { useI18n } from '@/i18n';
import { recall, listMemories, type Memory } from '@/utils/memory-api';

const emit = defineEmits<{
  navigate: [page: 'home' | 'shorten' | 'memories' | 'history'];
}>();

const { userState } = useStorage();
const { t, tKey } = useI18n();

const query = ref('');
const results = ref<Memory[]>([]);
const searching = ref(false);
const loadingRecent = ref(false);
const error = ref('');
const expandedId = ref<string | null>(null);

const token = computed(() => userState.value.tokens?.token || '');

onMounted(async () => {
  if (!token.value) return;
  loadingRecent.value = true;
  try {
    const res = await listMemories(token.value, { limit: 10 });
    results.value = res.results;
  } catch { /* silent */ }
  loadingRecent.value = false;
});

async function handleSearch() {
  const q = query.value.trim();
  if (!q || searching.value) return;
  if (!token.value) { error.value = t.value.signInRequired; return; }
  searching.value = true; error.value = ''; results.value = [];
  try {
    const res = await recall(token.value, q, { limit: 20 });
    results.value = res.results;
    if (res.count === 0) error.value = t.value.noMemoriesFound;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Search failed';
  } finally { searching.value = false; }
}

function toggleExpand(id: string) { expandedId.value = expandedId.value === id ? null : id; }
function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(d).toLocaleDateString();
}

function typeLabel(type: string): string { return tKey(type) || type; }

function sourceUrl(m: Memory): string | null {
  const meta = m.metadata as Record<string, unknown> | undefined;
  return (meta?.source_url as string) || null;
}

function previewContent(c: string, max = 200): string { return c.length <= max ? c : c.substring(0, max) + '…'; }
async function copyContent(c: string) { try { await navigator.clipboard.writeText(c); } catch { /* noop */ } }
function openSource(url: string) { chrome.tabs.create({ url }); }
</script>

<template>
  <div class="memories-page">
    <div class="mem-top-bar">
      <button class="back-btn" @click="emit('navigate', 'home')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
      </button>
      <h2 class="page-title">{{ t.memories }}</h2>
    </div>
    <div class="search-bar">
      <input v-model="query" type="text" class="input-field search-input" :placeholder="t.searchMemories" @keyup.enter="handleSearch" autofocus />
      <button class="btn btn--primary search-btn" :disabled="searching || !query.trim()" @click="handleSearch">
        {{ searching ? '…' : t.recall }}
      </button>
    </div>
    <div v-if="error" class="mem-error">{{ error }}</div>
    <div v-if="loadingRecent" class="mem-loading"><div class="loading-spinner"></div></div>

    <div class="results-list" v-if="results.length">
      <div v-for="mem in results" :key="mem.id" class="mem-card" :class="{ expanded: expandedId === mem.id }">
        <div class="mem-card-header" @click="toggleExpand(mem.id)">
          <span class="mem-type" :class="'type-' + mem.memory_type">{{ typeLabel(mem.memory_type) }}</span>
          <span class="mem-time">{{ timeAgo(mem.created_at) }}</span>
          <button v-if="sourceUrl(mem)" class="mem-source-btn" @click.stop="openSource(sourceUrl(mem)!)">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </button>
        </div>
        <div class="mem-card-body" v-if="expandedId === mem.id">
          <div class="mem-content">{{ mem.content }}</div>
          <div class="mem-meta"><span>{{ t.importance }}: {{ Math.round(mem.importance * 100) }}%</span><span>TTL: {{ mem.ttl_level }}</span></div>
          <button class="mem-copy-btn" @click="copyContent(mem.content)">{{ t.copy }}</button>
        </div>
        <div class="mem-card-body mem-preview" v-else>{{ previewContent(mem.content) }}</div>
      </div>
    </div>

    <div v-if="!loadingRecent && !results.length && !error" class="mem-empty">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
      <p>{{ t.noMemories }}</p>
    </div>
  </div>
</template>

<style scoped>
.memories-page { display: flex; flex-direction: column; flex: 1; }
.mem-top-bar { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: var(--bg-base); border-bottom: 1px solid var(--border-subtle); }
.back-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: none; border-radius: var(--radius-sm); background: transparent; color: var(--text-muted); cursor: pointer; }
.back-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.page-title { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.search-bar { display: flex; gap: 6px; padding: 10px 12px; background: var(--bg-base); border-bottom: 1px solid var(--border-subtle); }
.search-input { flex: 1; padding: 7px 10px; font-size: 12px; }
.search-btn { flex-shrink: 0; padding: 7px 12px; font-size: 11px; }
.mem-error { padding: 8px 12px; color: var(--error); font-size: 11px; text-align: center; background: rgba(217,48,37,0.06); }
.mem-loading { display: flex; justify-content: center; padding: 32px 0; }
.results-list { flex: 1; overflow-y: auto; padding: 8px 12px; }
.mem-card { background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); margin-bottom: 6px; overflow: hidden; }
.mem-card.expanded { border-color: var(--accent); }
.mem-card-header { display: flex; align-items: center; gap: 8px; padding: 8px 10px; cursor: pointer; user-select: none; }
.mem-type { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 2px 6px; border-radius: 4px; }
.type-semantic { background: var(--accent-dim); color: var(--accent-text); }
.type-episodic { background: var(--violet-dim); color: var(--violet); }
.type-procedural { background: rgba(15,157,88,0.10); color: var(--success); }
.mem-time { font-size: 10px; color: var(--text-muted); flex: 1; }
.mem-source-btn { width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border: none; border-radius: 4px; background: transparent; color: var(--text-muted); cursor: pointer; }
.mem-source-btn:hover { color: var(--accent); background: var(--bg-hover); }
.mem-card-body { padding: 0 10px 10px; font-size: 11px; line-height: 1.6; color: var(--text-secondary); }
.mem-preview { white-space: pre-line; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
.mem-content { white-space: pre-line; color: var(--text-primary); }
.mem-meta { display: flex; gap: 12px; margin-top: 6px; font-size: 9px; color: var(--text-muted); }
.mem-copy-btn { margin-top: 6px; padding: 3px 10px; border: 1px solid var(--border-default); border-radius: var(--radius-sm); background: transparent; color: var(--text-secondary); font-size: 10px; cursor: pointer; }
.mem-copy-btn:hover { border-color: var(--accent); color: var(--accent); }
.mem-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; gap: 10px; color: var(--text-muted); font-size: 12px; text-align: center; }
</style>
