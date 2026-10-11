<script setup lang="ts">
// 占位页：后续步骤开放的功能入口
import EmptyState from '@/components/EmptyState.vue';

defineProps<{ title?: string; description?: string }>();
</script>

<template>
  <main class="stub-page">
    <div class="stub-card">
      <EmptyState icon="◔" :title="title ?? '该页面正在建设中'" :description="description ?? '这个功能将在后续步骤开放，敬请期待'">
        <template #actions>
          <RouterLink to="/"><el-button type="primary" plain>返回首页</el-button></RouterLink>
        </template>
      </EmptyState>
    </div>
  </main>
</template>

<style scoped>
.stub-page {
  min-height: calc(100vh - var(--tw-topbar-h));
  display: grid;
  place-items: center;
  padding: 40px 18px;
}

.stub-card {
  background: var(--tw-surface);
  border: 1px solid var(--tw-line);
  border-radius: var(--tw-r-card);
  padding: 20px 30px;
  max-width: 420px;
  width: 100%;
}
</style>
