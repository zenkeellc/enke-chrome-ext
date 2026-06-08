<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  plan: string;
  user: { id: number; username: string; email: string } | null;
}>();

const emit = defineEmits<{
  navigate: [page: 'history'];
  logout: [];
}>();

function openAllLinks() {
  chrome.tabs.create({ url: 'https://www.en.ke/console/links' });
}

const planLabel = computed(() => {
  const map: Record<string, string> = { hobby: 'H', pro: 'Pro', business: 'Biz', enterprise: 'Ent' };
  return map[props.plan] || props.plan;
});

</script>

<template>
  <header class="header-bar">
    <div class="header-left">
      <svg class="logo-mark" viewBox="0 0 48 48" fill="none" width="20" height="20">
        <path d="M 6 39 C 6 10, 20 10, 20 20 C 20 28, 34 10, 42 24"
          stroke="currentColor" stroke-width="3.5"
          stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="6" cy="39" r="4" fill="currentColor"/>
        <circle cx="42" cy="24" r="4" fill="currentColor"/>
      </svg>
      <span class="brand">en.ke</span>
      <span class="plan-badge" :class="'plan-' + plan">{{ planLabel }}</span>
    </div>

    <div class="header-right">
      <!-- Clock / history icon -->
      <button class="icon-btn" @click="emit('navigate', 'history')" title="Recent links">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </button>

      <!-- All links / dashboard icon -->
      <button class="icon-btn" @click="openAllLinks" title="All links">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </button>

      <!-- Logout icon -->
      <button class="icon-btn icon-btn--logout" @click="emit('logout')" title="Sign out">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--bg-base);
  border-bottom: 1px solid var(--border-subtle);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.logo-mark {
  color: var(--accent);
  filter: drop-shadow(0 0 6px var(--accent-glow));
}

.brand {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.plan-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 8px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.plan-hobby     { background: rgba(255,255,255,0.06); color: var(--text-muted); }
.plan-pro       { background: var(--accent-dim);        color: var(--accent); }
.plan-business  { background: rgba(167,139,250,0.12);   color: var(--violet); }
.plan-enterprise{ background: rgba(251,191,36,0.15);    color: #fbbf24; }

.header-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}

.icon-btn:hover {
  color: var(--accent);
  background: var(--accent-dim);
  border-color: var(--border-default);
}

.icon-btn--logout:hover {
  color: var(--error);
  background: rgba(248, 113, 113, 0.1);
  border-color: rgba(248, 113, 113, 0.2);
}
</style>
