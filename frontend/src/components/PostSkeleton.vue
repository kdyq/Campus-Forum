<script setup lang="ts">
// 帖子列表骨架屏：几何复刻帖子条目（36px 圆头像 + 两行标题 + 元数据行）
withDefaults(defineProps<{ rows?: number }>(), { rows: 6 });
</script>

<template>
  <div class="skeleton-list" aria-hidden="true">
    <div v-for="i in rows" :key="i" class="skeleton-row">
      <div class="sk sk-avatar"></div>
      <div class="sk-lines">
        <div class="sk sk-line" style="width: 60%"></div>
        <div class="sk sk-line" style="width: 90%"></div>
        <div class="sk sk-line sk-meta" style="width: 40%"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-row {
  display: flex;
  gap: 13px;
  padding: 15px 18px;
}

.skeleton-row + .skeleton-row {
  border-top: 1px solid var(--tw-line);
}

.sk {
  background: var(--tw-surface-2);
  border-radius: var(--tw-r-ctrl);
}

.sk-avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--tw-r-full);
  flex: none;
}

.sk-lines {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.sk-line {
  height: 15px;
}

.sk-meta {
  height: 11px;
}
</style>
