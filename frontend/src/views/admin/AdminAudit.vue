<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { fetchAuditLogs, type AuditLogItem } from '@/api/admin';
import { formatTime } from '@/utils/format';

const items = ref<AuditLogItem[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);

const ACTION_LABELS: Record<string, string> = {
  'user.ban': '封禁用户',
  'user.update': '更新用户',
  'user.set_role': '调整角色',
  'post.pin': '置顶帖子',
  'post.unpin': '取消置顶',
  'post.feature': '加精',
  'post.unfeature': '取消加精',
  'post.lock': '锁定',
  'post.unlock': '解锁',
  'post.remove': '下架',
  'post.restore': '恢复',
  'post.approve': '审核通过',
  'board.update': '更新板块',
  'tag.create': '新增标签',
};

async function load() {
  loading.value = true;
  try {
    const r = await fetchAuditLogs(page.value);
    items.value = r.items;
    total.value = r.total;
  } catch {
    ElMessage.error('日志加载失败');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <h2 class="page-h">操作日志</h2>
    <el-table :data="items" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column label="操作人" width="140">
        <template #default="{ row }">{{ row.actor ? `${row.actor.displayName}（@${row.actor.username}）` : '系统' }}</template>
      </el-table-column>
      <el-table-column label="动作" width="140">
        <template #default="{ row }">{{ ACTION_LABELS[row.action] ?? row.action }}</template>
      </el-table-column>
      <el-table-column label="对象" width="140">
        <template #default="{ row }">{{ row.targetType ?? '—' }} #{{ row.targetId ?? '—' }}</template>
      </el-table-column>
      <el-table-column label="详情" min-width="200">
        <template #default="{ row }">
          <code class="meta-json">{{ row.meta ? JSON.stringify(row.meta) : '—' }}</code>
        </template>
      </el-table-column>
      <el-table-column prop="ip" label="IP" width="130" />
      <el-table-column label="时间" width="170">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > 30"
      class="pager"
      layout="prev, pager, next"
      :total="total"
      :page-size="30"
      :current-page="page"
      @current-change="(p: number) => { page = p; load(); }"
    />
  </div>
</template>

<style scoped>
.page-h {
  margin: 0 0 16px;
  font-size: var(--tw-fs-title-lg);
  color: var(--tw-ink);
}

.meta-json {
  font-family: var(--tw-font-mono);
  font-size: 12px;
  color: var(--tw-ink-2);
  word-break: break-all;
}

.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
