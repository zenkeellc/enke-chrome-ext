<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{ 'login-success': [] }>();

const loading = ref(false);
const error = ref('');

async function handleLogin() {
  loading.value = true;
  error.value = '';
  try {
    const extId = chrome.runtime.id;
    const loginUrl = `https://www.en.ke/login?source=extension&extid=${extId}`;
    await chrome.tabs.create({ url: loginUrl, active: true });
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to open login page';
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <!-- Glow orb -->
    <div class="glow-orb"></div>

    <div class="login-card">
      <!-- Logo -->
      <svg class="logo" viewBox="0 0 48 48" fill="none" width="44" height="44">
        <path d="M 6 39 C 6 10, 20 10, 20 20 C 20 28, 34 10, 42 24"
          stroke="currentColor" stroke-width="3"
          stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="6" cy="39" r="4.5" fill="currentColor"/>
        <circle cx="42" cy="24" r="4.5" fill="currentColor"/>
      </svg>

      <h1 class="title">en.ke</h1>
      <p class="subtitle">Shorten. Share. Track.</p>

      <button class="signin-btn" :disabled="loading" @click="handleLogin">
        <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span v-if="!loading">Continue with Google</span>
        <span v-else>Opening sign-in…</span>
      </button>

      <p v-if="error" class="error">{{ error }}</p>

      <p class="hint">
        A new tab opens for authentication.
        <br/>Return here afterwards.
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 360px;
  padding: 24px;
  position: relative;
  background: radial-gradient(ellipse at 50% 30%, rgba(0, 229, 255, 0.06) 0%, transparent 60%);
}

.glow-orb {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 60px;
  background: var(--accent);
  border-radius: 50%;
  filter: blur(48px);
  opacity: 0.12;
  pointer-events: none;
}

.login-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  z-index: 1;
}

.logo {
  color: var(--accent);
  filter: drop-shadow(0 0 16px var(--accent-glow));
  margin-bottom: 16px;
  animation: logoFloat 4s ease-in-out infinite;
}

@keyframes logoFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.title {
  font-size: 26px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  margin-bottom: 2px;
}

.subtitle {
  font-size: 12px;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 500;
  margin-bottom: 28px;
}

.signin-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s var(--ease-out);
  justify-content: center;
  position: relative;
}

.signin-btn:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.2);
  background: var(--bg-hover);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.03);
  transform: translateY(-1px);
}

.signin-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.google-icon {
  flex-shrink: 0;
}

.error {
  color: var(--error);
  font-size: 11px;
  margin-top: 14px;
}

.hint {
  margin-top: 24px;
  font-size: 10px;
  color: var(--text-muted);
  line-height: 1.6;
}
</style>
