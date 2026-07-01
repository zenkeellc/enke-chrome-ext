<script setup lang="ts">
import { computed } from 'vue';
import { useStorage } from '../composables/useStorage';
import { useI18n } from '@/i18n';

const emit = defineEmits<{
  navigate: [page: 'shorten' | 'memories' | 'history' | 'agent-memory'];
}>();

const { userState } = useStorage();
const { t, tKey } = useI18n();

const userName = computed(() => userState.value.user?.email || userState.value.user?.username || '');

const planLabel = computed(() => {
  const map: Record<string, string> = { hobby: 'Hobby', pro: 'Pro', business: 'Biz', max: 'Max' };
  return map[userState.value.plan] || userState.value.plan || 'Hobby';
});

function goTo(page: 'shorten' | 'memories' | 'history') {
  emit('navigate', page);
}

function startAgentMemory() {
  emit('navigate', 'agent-memory');
}
</script>

<template>
  <div class="home-page">
    <!-- Greeting -->
    <div class="home-hero">
      <h2 class="home-greeting">{{ t.welcome }}{{ userName ? ', ' + userName.split('@')[0] : '' }}</h2>
      <span class="home-plan" v-if="userState.plan">{{ planLabel }}</span>
    </div>

    <!-- Quick action cards -->
    <div class="home-cards">
      <button class="home-card home-card--primary" @click="startAgentMemory">
        <span class="home-card-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </span>
        <span class="home-card-title">{{ t.agentMemory }}</span>
        <span class="home-card-desc">{{ t.capturePlaceholder }}</span>
      </button>

      <button class="home-card" @click="goTo('shorten')">
        <span class="home-card-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        </span>
        <span class="home-card-title">{{ t.shorten }}</span>
        <span class="home-card-desc">{{ t.viewAllLinks }}</span>
      </button>

      <button class="home-card" @click="goTo('memories')">
        <span class="home-card-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        </span>
        <span class="home-card-title">{{ t.memories }}</span>
        <span class="home-card-desc">{{ t.searchMemories }}</span>
      </button>

      <button class="home-card" @click="goTo('history')">
        <span class="home-card-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </span>
        <span class="home-card-title">{{ t.history }}</span>
        <span class="home-card-desc">{{ t.recentActivity }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  flex: 1;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.home-hero {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.home-greeting {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.home-plan {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--accent-dim);
  color: var(--accent-text);
  text-transform: uppercase;
}

.home-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.home-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.15s var(--ease-out);
  text-align: left;
  color: var(--text-primary);
}

.home-card:hover {
  border-color: var(--accent);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-sm);
}

.home-card--primary {
  border-color: var(--accent-dim);
  background: var(--accent-dim);
}

.home-card--primary:hover {
  border-color: var(--accent);
  background: var(--bg-active);
}

.home-card-icon {
  color: var(--accent);
  opacity: 0.8;
}

.home-card-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.home-card-desc {
  font-size: 10px;
  color: var(--text-muted);
}
</style>
