<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuth } from './composables/useAuth';
import LoginPage from './pages/LoginPage.vue';
import ShortenPage from './pages/ShortenPage.vue';
import HistoryPage from './pages/HistoryPage.vue';

const { storage, init, doLogout, loggingIn, error } = useAuth();

type Page = 'login' | 'shorten' | 'history';

const currentPage = ref<Page>('login');
const loading = ref(true);

onMounted(async () => {
  const loggedIn = await init();
  currentPage.value = loggedIn ? 'shorten' : 'login';
  loading.value = false;
});

function onLoginSuccess() {
  currentPage.value = 'shorten';
}

function navigateTo(page: Page) {
  currentPage.value = page;
}

async function onLogout() {
  await doLogout();
  currentPage.value = 'login';
}
</script>

<template>
  <div class="app" v-if="!loading">
    <LoginPage
      v-if="currentPage === 'login'"
      @login-success="onLoginSuccess"
      :loading="loggingIn"
      :error="error"
    />
    <ShortenPage
      v-else-if="currentPage === 'shorten'"
      @navigate="navigateTo"
      @logout="onLogout"
    />
    <HistoryPage
      v-else-if="currentPage === 'history'"
      @navigate="navigateTo"
    />
  </div>
  <div class="app app--loading" v-else>
    <div class="loading-spinner"></div>
  </div>
</template>

<style>
@import './styles/main.css';
</style>
