<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import QRCodeStyling, { type Options } from 'qr-code-styling';

const props = defineProps<{
  shortUrl: string;
  originalUrl: string;
  slug: string;
  copied: boolean;
}>();

const emit = defineEmits<{
  copy: [];
}>();

const qrContainer = ref<HTMLDivElement>();
const revealed = ref(false);
let qrCode: QRCodeStyling | null = null;

onMounted(() => {
  nextTick(() => {
    revealed.value = true;
    createQR();
  });
});

watch(() => props.shortUrl, () => createQR());

function createQR() {
  if (!qrContainer.value) return;
  const opts: Options = {
    width: 172, height: 172, type: 'svg', data: props.shortUrl,
    image: 'https://www.en.ke/favicon.svg',
    imageOptions: { crossOrigin: 'anonymous', margin: 4, imageSize: 0.35 },
    dotsOptions: { color: '#00e5ff', type: 'rounded' },
    cornersSquareOptions: { type: 'extra-rounded', color: '#00e5ff' },
    cornersDotOptions: { type: 'dot', color: '#00e5ff' },
  };
  if (qrCode) { qrCode.update(opts); } else { qrCode = new QRCodeStyling(opts); qrCode.append(qrContainer.value); }
}

function downloadQR() { if (qrCode) qrCode.download({ name: `enke-${props.slug}`, extension: 'png' }); }
function openLink() { chrome.tabs.create({ url: props.shortUrl }); }
</script>

<template>
  <div class="link-result" :class="{ 'is-revealed': revealed }">
    <!-- Success -->
    <div class="success-line">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <span>Link created</span>
    </div>

    <!-- Short URL -->
    <div class="url-box" :class="{ copied: copied }" @click="emit('copy')">
      <span class="url-text">{{ shortUrl }}</span>
      <span class="copy-indicator">{{ copied ? 'Copied' : 'Copy' }}</span>
    </div>

    <!-- QR -->
    <div class="qr-wrapper">
      <div ref="qrContainer" class="qr-inner"></div>
      <div class="qr-ring"></div>
    </div>

    <!-- Actions -->
    <div class="actions">
      <button class="act-btn" @click="emit('copy')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy
      </button>
      <button class="act-btn" @click="downloadQR">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        QR
      </button>
      <button class="act-btn" @click="openLink">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        Open
      </button>
    </div>
  </div>
</template>

<style scoped>
.link-result { opacity: 0; transform: translateY(10px); transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
.link-result.is-revealed { opacity: 1; transform: translateY(0); }

.success-line { display: flex; align-items: center; gap: 6px; justify-content: center; font-size: 12px; font-weight: 600; color: var(--success); margin-bottom: 14px; }

.url-box { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-md); cursor: pointer; transition: all 0.2s; margin-bottom: 14px; }
.url-box:hover { border-color: var(--accent); box-shadow: 0 0 12px var(--accent-dim); }
.url-box.copied { border-color: var(--success); background: rgba(52, 211, 153, 0.06); }

.url-text { font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace; font-size: 12px; font-weight: 500; color: var(--accent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.copy-indicator { font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; flex-shrink: 0; margin-left: 8px; transition: color 0.2s; }
.url-box.copied .copy-indicator { color: var(--success); }

.qr-wrapper { display: flex; justify-content: center; margin-bottom: 16px; position: relative; }
.qr-inner { border-radius: var(--radius-lg); overflow: hidden; position: relative; z-index: 1; }
.qr-ring { position: absolute; inset: -4px; border-radius: 16px; border: 1px solid var(--border-default); pointer-events: none; }

.actions { display: flex; gap: 6px; }
.act-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 8px 0; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-md); color: var(--text-secondary); font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.act-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }
</style>
