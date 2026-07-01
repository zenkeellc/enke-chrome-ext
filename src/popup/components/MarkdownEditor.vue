<script setup lang="ts">
import { ref, computed } from 'vue';
import { marked } from 'marked';

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
  maxChars?: number | null; // null = unlimited
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  save: [content: string];
}>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);

const charCount = computed(() => props.modelValue.length);
const overLimit = computed(() => props.maxChars != null && charCount.value > props.maxChars);
const limitLabel = computed(() => props.maxChars ? `${charCount.value.toLocaleString()} / ${props.maxChars.toLocaleString()}` : `${charCount.value.toLocaleString()} chars`);

const previewHtml = computed(() => {
  if (!props.modelValue) return '<p class="preview-empty">Nothing to preview</p>';
  return marked.parse(props.modelValue) as string;
});

// ── Toolbar ──────────────────────────────────────────────────

function insertMarkdown(wrap?: string, syntax?: string) {
  const el = textareaRef.value;
  if (!el) return;
  const start = el.selectionStart, end = el.selectionEnd;
  const text = props.modelValue;
  const selected = text.substring(start, end);
  let replacement: string;
  if (wrap) {
    replacement = wrap + selected + wrap;
  } else {
    replacement = (syntax || '').replace('$1', selected);
  }
  const newText = text.substring(0, start) + replacement + text.substring(end);
  emit('update:modelValue', newText);
  requestAnimationFrame(() => {
    el.focus();
    const cursor = start + (wrap ? wrap.length : replacement.length);
    el.setSelectionRange(cursor, cursor);
  });
}

function insertBold() { insertMarkdown('**'); }
function insertItalic() { insertMarkdown('*'); }
function insertLink() { insertMarkdown('[$1](url)'); }
function insertList() { insertMarkdown('\n- $1'); }
function insertHeading() { insertMarkdown('\n## $1'); }

function handleSave() {
  emit('save', props.modelValue);
}

function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    handleSave();
  }
}
</script>

<template>
  <div class="md-editor">
    <!-- Toolbar -->
    <div class="md-toolbar">
      <button class="md-tool-btn" title="Bold" @click="insertBold"><b>B</b></button>
      <button class="md-tool-btn" title="Italic" @click="insertItalic"><i>I</i></button>
      <button class="md-tool-btn" title="Link" @click="insertLink">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      </button>
      <button class="md-tool-btn" title="Heading" @click="insertHeading">H</button>
      <button class="md-tool-btn" title="List" @click="insertList">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
      </button>
      <div class="md-toolbar-spacer"></div>
      <button class="md-tool-btn md-save-btn" :disabled="overLimit" :title="overLimit ? 'Content exceeds plan limit' : 'Save (⌘↵)'" @click="handleSave">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
      </button>
    </div>

    <!-- Edit area — tall, upper portion -->
    <textarea
      ref="textareaRef"
      class="md-textarea"
      :value="modelValue"
      :placeholder="placeholder || 'Write markdown…'"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      @keydown="onKeydown"
    ></textarea>

    <!-- Divider -->
    <div class="md-divider">
      <span class="md-divider-label">Preview</span>
    </div>

    <!-- Preview — always visible, lower portion -->
    <div class="md-preview" v-html="previewHtml"></div>

    <!-- Footer -->
    <div class="md-footer">
      <span :class="{ 'over-limit': overLimit }">{{ limitLabel }}</span>
      <span v-if="overLimit" class="over-limit-msg">Exceeds plan limit — please trim</span>
      <span v-else>⌘↵ to save</span>
    </div>
  </div>
</template>

<style scoped>
.md-editor {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--bg-surface);
}

/* ── Toolbar ──────────────────────────── */
.md-toolbar {
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 3px 4px;
  background: var(--bg-base);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.md-tool-btn {
  width: 24px; height: 24px;
  display: flex; align-items: center; justify-content: center;
  border: none; border-radius: 4px;
  background: transparent; color: var(--text-secondary);
  font-size: 11px; cursor: pointer;
  transition: all 0.15s;
}
.md-tool-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.md-toolbar-spacer { flex: 1; }
.md-save-btn { color: var(--accent); font-weight: 700; }
.md-save-btn:hover { background: var(--accent-dim); }

/* ── Textarea (tall, flex-grows to fill space) ── */
.md-textarea {
  flex: 1;
  min-height: 180px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 11px;
  line-height: 1.65;
  resize: none;
  outline: none;
}

.md-textarea::placeholder { color: var(--text-muted); }

/* ── Divider ──────────────────────────── */
.md-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 10px;
  background: var(--bg-base);
  border-top: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.md-divider-label {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

/* ── Preview (below divider, scrollable) ── */
.md-preview {
  flex: 0 0 auto;
  max-height: 40%;
  min-height: 80px;
  overflow-y: auto;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-primary);
  background: var(--bg-base);
}

/* Preview typography via :deep() for v-html */
.md-preview :deep(h1),
.md-preview :deep(h2),
.md-preview :deep(h3) {
  color: var(--text-primary);
  margin: 8px 0 4px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.3;
}
.md-preview :deep(h1) { font-size: 17px; }
.md-preview :deep(h2) { font-size: 14px; }
.md-preview :deep(h3) { font-size: 12px; }
.md-preview :deep(p) { margin: 4px 0; }
.md-preview :deep(ul), .md-preview :deep(ol) { padding-left: 16px; margin: 4px 0; }
.md-preview :deep(li) { margin: 1px 0; }
.md-preview :deep(code) {
  background: var(--bg-hover); padding: 1px 4px; border-radius: 3px;
  font-family: 'SF Mono', 'Fira Code', monospace; font-size: 10px;
}
.md-preview :deep(pre) {
  background: var(--bg-surface); padding: 8px; border-radius: var(--radius-sm);
  overflow-x: auto; font-size: 10px;
}
.md-preview :deep(pre code) { background: none; padding: 0; }
.md-preview :deep(blockquote) {
  border-left: 2px solid var(--accent); margin: 4px 0; padding-left: 8px; color: var(--text-secondary);
}
.md-preview :deep(a) { color: var(--accent-text); text-decoration: none; }
.md-preview :deep(a:hover) { text-decoration: underline; }
.md-preview :deep(img) { max-width: 100%; border-radius: var(--radius-sm); }
.md-preview :deep(.preview-empty) { color: var(--text-muted); font-style: italic; }

/* ── Footer ───────────────────────────── */
.md-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: 2px 10px; background: var(--bg-base);
  border-top: 1px solid var(--border-subtle);
  font-size: 9px; color: var(--text-muted);
  flex-shrink: 0;
}
.over-limit { color: var(--error); font-weight: 600; }
.over-limit-msg { color: var(--error); }
</style>
