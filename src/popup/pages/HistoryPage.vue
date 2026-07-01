<script setup lang="ts">
import { useStorage } from '../composables/useStorage';
import { useI18n } from '@/i18n';
import RecentList from '../components/RecentList.vue';

const emit = defineEmits<{ navigate: [page: 'home' | 'shorten' | 'memories' | 'history'] }>();
const { userState } = useStorage();
const { t } = useI18n();

function openDashboard() {
  chrome.tabs.create({ url: 'https://www.en.ke/console/links' });
}
</script>

<template>
  <div class="history-page">
    <div class="page-top-bar">
      <button class="back-btn" @click="emit('navigate', 'home')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
      </button>
      <h2 class="page-title">{{ t.history }}</h2>
    </div>

    <div class="history-body">
      <RecentList :links="userState.recentLinks" />
      <div v-if="userState.recentLinks.length === 0" class="empty">
        <p>{{ t.noLinks }}</p>
      </div>
      <button class="dashboard-link" @click="openDashboard">
        {{ t.viewAll }}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.history-page { display: flex; flex-direction: column; flex: 1; }

.page-top-bar { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: var(--bg-base); border-bottom: 1px solid var(--border-subtle); }
.back-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: none; border-radius: var(--radius-sm); background: transparent; color: var(--text-muted); cursor: pointer; }
.back-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.page-title { font-size: 14px; font-weight: 700; color: var(--text-primary); flex: 1; }

.history-body { padding: 12px; flex: 1; }

.empty { display: flex; align-items: center; justify-content: center; padding: 40px 0; color: var(--text-muted); font-size: 12px; }

.dashboard-link {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%; padding: 9px; margin-top: 16px;
  background: var(--bg-surface); border: 1px solid var(--border-default);
  border-radius: var(--radius-md); color: var(--text-secondary);
  font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s;
}
.dashboard-link:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }
</style>
