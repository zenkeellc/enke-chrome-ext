<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from '@/i18n';

const props = defineProps<{
  plan: string;
  user: { id: number; username: string; email: string } | null;
  accounts: { email: string; user: { id: number; username: string; email: string }; plan: string }[];
  activeEmail: string;
  currentPage: 'home' | 'shorten' | 'memories' | 'history';
}>();

const emit = defineEmits<{
  navigate: [page: 'home' | 'shorten' | 'memories' | 'history'];
  logout: [];
  'agent-memory': [];
  switchAccount: [email: string];
  addAccount: [];
}>();

const { t, locales, localeCode, setLocale } = useI18n();
const menuOpen = ref(false);

function toggleMenu() { menuOpen.value = !menuOpen.value; }
function closeMenu() { menuOpen.value = false; }

function onSwitchAccount(email: string) { closeMenu(); emit('switchAccount', email); }
function onAddAccount() { closeMenu(); emit('addAccount'); }
function onSignOut() { closeMenu(); emit('logout'); }
function onAgentMemory() { emit('agent-memory'); }

function openDashboard() {
  chrome.tabs.create({ url: 'https://www.en.ke/console/links' });
}

const planLabel = computed(() => {
  const map: Record<string, string> = { hobby: 'H', pro: 'Pro', business: 'Biz', max: 'Max' };
  return map[props.plan] || props.plan;
});

const displayEmail = computed(() => props.user?.email || props.activeEmail || '');

const otherAccounts = computed(() => props.accounts.filter(a => a.email !== props.activeEmail));

const tabs = computed(() => [
  { id: 'home' as const, label: t.value.home },
  { id: 'shorten' as const, label: t.value.shorten },
  { id: 'memories' as const, label: t.value.memories },
  { id: 'history' as const, label: t.value.history },
]);
</script>

<template>
  <header class="header-bar">
    <!-- Top: brand + user -->
    <div class="header-top">
      <div class="header-brand">
        <svg class="logo-mark" viewBox="0 0 48 48" fill="none" width="16" height="16">
          <path d="M 6 39 C 6 10, 20 10, 20 20 C 20 28, 34 10, 42 24" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="6" cy="39" r="4" fill="currentColor"/>
          <circle cx="42" cy="24" r="4" fill="currentColor"/>
        </svg>
        <span class="brand">en.ke</span>
        <span class="plan-badge" :class="'plan-' + plan">{{ planLabel }}</span>
      </div>

      <div class="header-right">
        <button class="icon-btn" @click="onAgentMemory" :title="t.agentMemory">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </button>

        <div class="user-area" @click="toggleMenu">
          <span class="user-email">{{ displayEmail }}</span>
          <svg class="user-chevron" :class="{ open: menuOpen }" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>

          <div v-if="menuOpen" class="user-dropdown" @click.stop>
            <div class="dropdown-section-label">{{ t.current }}</div>
            <div class="dropdown-account current">
              <span class="dropdown-email">{{ displayEmail }}</span>
              <span class="dropdown-plan" :class="'plan-' + plan">{{ planLabel }}</span>
              <span class="dropdown-check">✓</span>
            </div>
            <template v-if="otherAccounts.length">
              <div class="dropdown-divider"></div>
              <div class="dropdown-section-label">{{ t.switchTo }}</div>
              <div v-for="acct in otherAccounts" :key="acct.email" class="dropdown-account" @click="onSwitchAccount(acct.email)">
                <span class="dropdown-email">{{ acct.email }}</span>
              </div>
            </template>
            <div class="dropdown-divider"></div>
            <button class="dropdown-action" @click="onAddAccount">+ {{ t.addAccount }}</button>
            <button class="dropdown-action dropdown-action--danger" @click="onSignOut">{{ t.signOut }}</button>

            <!-- Locale switcher -->
            <div class="dropdown-divider"></div>
            <div class="dropdown-locales">
              <button
                v-for="loc in locales"
                :key="loc.code"
                class="locale-btn"
                :class="{ active: localeCode === loc.code }"
                @click="setLocale(loc.code)"
              >{{ loc.name }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom: tab navigation -->
    <nav class="header-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: currentPage === tab.id }"
        @click="emit('navigate', tab.id)"
      >{{ tab.label }}</button>
    </nav>

    <div v-if="menuOpen" class="menu-backdrop" @click="closeMenu"></div>
  </header>
</template>

<style scoped>
.header-bar {
  position: relative;
  background: var(--bg-base);
  border-bottom: 1px solid var(--border-subtle);
  z-index: 10;
}

/* ── Top row ──────────────────────────── */
.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 6px;
}

.logo-mark { color: var(--accent); }
.brand { font-size: 14px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em; }

.plan-badge {
  font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: var(--radius-full);
  letter-spacing: 0.04em; text-transform: uppercase;
}
.plan-hobby { background: var(--bg-hover); color: var(--text-muted); }
.plan-pro { background: var(--accent-dim); color: var(--accent-text); }
.plan-business { background: var(--violet-dim); color: var(--violet); }

.plan-max { background: rgba(251,191,36,0.12); color: #fbbf24; }

.header-right { display: flex; align-items: center; gap: 4px; }

.icon-btn {
  width: 28px; height: 28px; border-radius: var(--radius-sm);
  background: transparent; border: none; color: var(--text-secondary);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.15s;
}
.icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

/* ── User area ────────────────────────── */
.user-area {
  display: flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: var(--radius-sm); cursor: pointer; position: relative;
  transition: background 0.15s;
}
.user-area:hover { background: var(--bg-hover); }
.user-email { font-size: 11px; color: var(--text-secondary); max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user-chevron { color: var(--text-muted); transition: transform 0.2s; flex-shrink: 0; }
.user-chevron.open { transform: rotate(180deg); }

/* ── Dropdown ──────────────────────────── */
.user-dropdown {
  position: absolute; top: 100%; right: 0; margin-top: 4px; width: 220px;
  background: var(--bg-elevated); border: 1px solid var(--border-default);
  border-radius: var(--radius-md); box-shadow: var(--shadow-md); z-index: 20;
  overflow: hidden; animation: dropdownIn 0.12s var(--ease-out);
}
@keyframes dropdownIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
.dropdown-section-label { padding: 6px 10px 2px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
.dropdown-account { display: flex; align-items: center; gap: 8px; padding: 8px 10px; cursor: pointer; transition: background 0.1s; }
.dropdown-account:hover { background: var(--bg-hover); }
.dropdown-account.current { cursor: default; }
.dropdown-email { font-size: 11px; color: var(--text-primary); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dropdown-plan { font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 4px; text-transform: uppercase; }
.dropdown-check { font-size: 11px; color: var(--accent); width: 14px; text-align: center; }
.dropdown-divider { height: 1px; background: var(--border-subtle); margin: 2px 0; }
.dropdown-action {
  display: flex; align-items: center; gap: 8px; width: 100%; padding: 7px 10px;
  border: none; background: transparent; color: var(--text-secondary); font-size: 11px;
  cursor: pointer; transition: all 0.1s; text-align: left;
}
.dropdown-action:hover { background: var(--bg-hover); color: var(--text-primary); }
.dropdown-action--danger:hover { color: var(--error); background: rgba(217,48,37,0.08); }

/* ── Locale switcher ───────────────────── */
.dropdown-locales { padding: 6px 8px; display: flex; flex-wrap: wrap; gap: 4px; }
.locale-btn {
  padding: 2px 6px; border: 1px solid var(--border-subtle); border-radius: 4px;
  background: transparent; color: var(--text-muted); font-size: 10px; cursor: pointer;
  transition: all 0.1s;
}
.locale-btn:hover { border-color: var(--accent); color: var(--accent); }
.locale-btn.active { background: var(--accent-dim); border-color: var(--accent); color: var(--accent-text); font-weight: 600; }

/* ── Tab navigation ────────────────────── */
.header-tabs {
  display: flex;
  gap: 0;
  padding: 0 4px;
  border-top: 1px solid var(--border-subtle);
}

.tab-btn {
  flex: 1;
  padding: 7px 0;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
  position: relative;
  bottom: -1px;
}

.tab-btn:hover { color: var(--text-primary); background: var(--bg-hover); }

.tab-btn.active {
  color: var(--accent-text);
  font-weight: 600;
  border-bottom-color: var(--accent);
}

/* ── Backdrop ──────────────────────────── */
.menu-backdrop { position: fixed; inset: 0; z-index: 5; }
</style>
