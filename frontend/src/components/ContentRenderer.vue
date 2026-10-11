<script setup lang="ts">
// 正文 Markdown 渲染（md-editor-v3 MdPreview），按设计规范 §3.4 对齐主题
import { MdPreview } from 'md-editor-v3';
import 'md-editor-v3/lib/preview.css';

defineProps<{ content: string }>();
</script>

<template>
  <MdPreview
    class="content-renderer"
    :model-value="content"
    theme="light"
    preview-theme="default"
    :code-foldable="false"
    :auto-fold-threshold="Infinity"
  />
</template>

<style scoped>
.content-renderer {
  --md-bk-color: var(--tw-surface-2);
  --md-color: var(--tw-ink-read);
  background: transparent;
  color: var(--tw-ink-read);
  font-size: var(--tw-fs-body-lg);
  line-height: var(--tw-lh-body-lg);
}

.content-renderer :deep(.md-editor-preview-wrapper) {
  padding: 0;
}

.content-renderer :deep(.md-editor-preview) {
  color: var(--tw-ink-read);
  font-size: var(--tw-fs-body-lg);
  line-height: var(--tw-lh-body-lg);
  word-break: break-word;
}

.content-renderer :deep(h1),
.content-renderer :deep(h2) {
  font-size: 16.5px;
  font-weight: 600;
  line-height: var(--tw-lh-title);
  border-bottom: 1px solid var(--tw-line);
  padding-bottom: 6px;
  margin: 18px 0 12px;
}

.content-renderer :deep(h3),
.content-renderer :deep(h4) {
  font-size: 15px;
  font-weight: 600;
  margin: 14px 0 8px;
}

.content-renderer :deep(p) {
  margin: 0 0 14px;
}

.content-renderer :deep(img) {
  max-width: 100%;
  border-radius: var(--tw-r-card);
  cursor: zoom-in;
}

.content-renderer :deep(blockquote) {
  border-left: 2px solid var(--tw-accent);
  padding-left: 14px;
  margin: 14px 0;
  color: var(--tw-ink-2);
}

.content-renderer :deep(blockquote p) {
  margin: 0;
}

.content-renderer :deep(ul),
.content-renderer :deep(ol) {
  padding-left: 18px;
  margin: 0 0 14px;
}

.content-renderer :deep(li) {
  margin: 4px 0;
}

.content-renderer :deep(code:not(pre code)) {
  background: var(--tw-surface-2);
  color: var(--tw-accent-ink);
  font-family: var(--tw-font-mono);
  font-size: 13px;
  border-radius: 4px;
  padding: 2px 6px;
}

.content-renderer :deep(pre) {
  background: #f7f9fa;
  border: 1px solid var(--tw-line);
  border-radius: var(--tw-r-ctrl);
  padding: 13px 15px;
  overflow-x: auto;
}

.content-renderer :deep(pre code) {
  background: transparent;
  color: var(--tw-ink);
  font-family: var(--tw-font-mono);
  font-size: 12.5px;
  line-height: 1.7;
  padding: 0;
}

.content-renderer :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 14px 0;
}

.content-renderer :deep(th),
.content-renderer :deep(td) {
  border: 1px solid var(--tw-line);
  padding: 6px 10px;
  font-size: var(--tw-fs-body-sm);
}

.content-renderer :deep(a) {
  color: var(--tw-accent);
}

.content-renderer :deep(hr) {
  border: none;
  border-top: 1px solid var(--tw-line);
  margin: 20px 0;
}
</style>
