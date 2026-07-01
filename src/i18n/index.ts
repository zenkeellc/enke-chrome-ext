import { ref, computed, type Ref } from 'vue';

// Locale imports
import enUS from './locales/en-US';
import zhCN from './locales/zh-CN';
import deDE from './locales/de-DE';
import esES from './locales/es-ES';
import frFR from './locales/fr-FR';
import jaJP from './locales/ja-JP';
import ruRU from './locales/ru-RU';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type LocaleData = Record<string, string>;

export interface Locale {
  code: string;
  name: string;
  data: LocaleData;
}

export const locales: Locale[] = [
  { code: 'en-US', name: enUS.name, data: enUS as unknown as LocaleData },
  { code: 'zh-CN', name: zhCN.name, data: zhCN as unknown as LocaleData },
  { code: 'de-DE', name: deDE.name, data: deDE as unknown as LocaleData },
  { code: 'es-ES', name: esES.name, data: esES as unknown as LocaleData },
  { code: 'fr-FR', name: frFR.name, data: frFR as unknown as LocaleData },
  { code: 'ja-JP', name: jaJP.name, data: jaJP as unknown as LocaleData },
  { code: 'ru-RU', name: ruRU.name, data: ruRU as unknown as LocaleData },
];

const STORAGE_KEY = 'enke_locale';

// Module-level state
const currentLocale: Ref<Locale> = ref(locales[0]);

function detectLocale(): Locale {
  const lang = navigator.language || 'en-US';
  // Exact match
  const exact = locales.find(l => l.code === lang);
  if (exact) return exact;
  // Prefix match (e.g., "zh" → "zh-CN", "de" → "de-DE")
  const prefix = lang.split('-')[0];
  const match = locales.find(l => l.code.startsWith(prefix));
  return match || locales[0];
}

async function loadSavedLocale(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const saved = result[STORAGE_KEY] as string | undefined;
    if (saved) {
      const match = locales.find(l => l.code === saved);
      if (match) { currentLocale.value = match; return; }
    }
  } catch { /* ignore */ }
  currentLocale.value = detectLocale();
}

let loaded = false;

export function useI18n() {
  const t = computed<LocaleData>(() => currentLocale.value.data);
  const localeCode = computed<string>(() => currentLocale.value.code);

  async function init(): Promise<void> {
    if (loaded) return;
    await loadSavedLocale();
    loaded = true;
  }

  function setLocale(code: string): void {
    const match = locales.find(l => l.code === code);
    if (match) {
      currentLocale.value = match;
      chrome.storage.local.set({ [STORAGE_KEY]: code }).catch(() => {});
    }
  }

  function tKey(key: string): string {
    return currentLocale.value.data[key] ?? key;
  }

  return { locales, currentLocale, localeCode, t, tKey, init, setLocale };
}
