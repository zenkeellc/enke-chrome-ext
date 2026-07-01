import { createApp } from 'vue';
import App from '@/popup/App.vue';

// Clear the critical loading placeholder
const appEl = document.getElementById('app');
if (appEl) appEl.innerHTML = '';

try {
  const app = createApp(App);

  // Global error handler
  app.config.errorHandler = (err, _instance, info) => {
    console.error('[en.ke] Vue error:', err, info);
    const el = document.getElementById('critical-error');
    if (el) {
      el.style.display = 'block';
      el.textContent = 'App Error: ' + String(err);
    }
  };

  app.mount('#app');
} catch (e) {
  console.error('[en.ke] Fatal mount error:', e);
  const el = document.getElementById('critical-error');
  if (el) {
    el.style.display = 'block';
    el.textContent = 'Fatal: ' + String(e);
  }
}
