<script setup lang="ts">
import { useStorage } from '../composables/useStorage';
import RecentList from '../components/RecentList.vue';

const emit = defineEmits<{ navigate: [page: 'shorten'] }>();
const { userState } = useStorage();

function handleCopy(text: string) {
  navigator.clipboard.writeText(text);
}

function openDashboard() {
  chrome.tabs.create({ url: 'https://www.en.ke/dashboard' });
}
</script>

<template>
  <div class="history-page">
    <div class="history-top">
      <button class="back-btn" @click="emit('navigate', 'shorten')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
        </svg>
        Back
      </button>
      <h2 class="page-title">Recent</h2>
    </div>

    <div class="history-body">
      <RecentList :links="userState.recentLinks" />

      <div v-if="userState.recentLinks.length === 0" class="empty">
        <p>No links yet. Shorten your first URL.</p>
      </div>

      <button class="dashboard-link" @click="openDashboard">
        View all on en.ke
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.history-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: var(--bg-deep);
}

.history-top {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  background: var(--bg-base);
  border-bottom: 1px solid var(--border-subtle);
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-muted);
  background: none;
  border: none;
  font-size: 12px;
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  transition: color 0.15s;
}

.back-btn:hover { color: var(--accent); }

.page-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.history-body {
  padding: 14px;
  flex: 1;
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: var(--text-muted);
  font-size: 12px;
}

.dashboard-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px;
  margin-top: 20px;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.dashboard-link:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-dim);
}
</style>
