<script setup lang="ts">
import { ref } from 'vue';
import type { RecentLink } from '@/utils/types';

defineProps<{ links: RecentLink[] }>();

const copiedSlug = ref<string | null>(null);

function openLink(url: string) {
  chrome.tabs.create({ url });
}

async function handleCopy(e: Event, url: string, slug: string) {
  e.stopPropagation();
  await navigator.clipboard.writeText(url);
  copiedSlug.value = slug;
  setTimeout(() => {
    if (copiedSlug.value === slug) copiedSlug.value = null;
  }, 2000);
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
</script>

<template>
  <div v-if="links.length > 0" class="recent">
    <div class="recent-label">Recent</div>

    <div
      v-for="link in links.slice(0, 5)"
      :key="link.slug"
      class="recent-item"
      @click="openLink(link.shortUrl)"
    >
      <div class="recent-left">
        <span class="recent-slug">en.ke/{{ link.slug }}</span>
        <span class="recent-origin">{{ link.originalUrl }}</span>
        <span class="recent-time">{{ timeAgo(link.createdAt) }}</span>
      </div>

      <!-- Copy button -->
      <button
        class="recent-btn"
        :class="{ 'recent-btn--copied': copiedSlug === link.slug }"
        @click="(e: Event) => handleCopy(e, link.shortUrl, link.slug)"
        title="Copy"
      >
        <!-- Check icon -->
        <svg v-if="copiedSlug === link.slug" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <!-- Copy icon -->
        <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      </button>

      <!-- Open link arrow -->
      <svg class="recent-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        <polyline points="15 3 21 3 21 9"/>
        <line x1="10" y1="14" x2="21" y2="3"/>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.recent {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle);
}

.recent-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 4px;
  cursor: pointer;
  transition: background 0.15s ease;
  border-radius: var(--radius-sm);
}

.recent-item:hover {
  background: var(--bg-surface);
}

.recent-left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.recent-slug {
  font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.15s;
}

.recent-item:hover .recent-slug {
  color: var(--accent);
}

.recent-origin {
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

.recent-time {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 1px;
  font-variant-numeric: tabular-nums;
}

/* ── Copy button ───────────────── */
.recent-btn {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
}

.recent-item:hover .recent-btn {
  opacity: 0.7;
}

.recent-btn:hover {
  opacity: 1 !important;
  color: var(--accent);
  background: var(--accent-dim);
}

.recent-btn--copied {
  opacity: 1 !important;
  color: var(--success) !important;
  background: rgba(52, 211, 153, 0.1);
}

/* ── Open arrow ────────────────── */
.recent-arrow {
  flex-shrink: 0;
  color: var(--text-muted);
  opacity: 0;
  transition: all 0.2s;
}

.recent-item:hover .recent-arrow {
  opacity: 0.6;
}

.recent-item:hover .recent-arrow:hover {
  opacity: 1;
  color: var(--accent);
}
</style>
