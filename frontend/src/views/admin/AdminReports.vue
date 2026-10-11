<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessageBox } from 'element-plus';
import { fetchAdminReports, handleAdminReport, type AdminReportItem } from '@/api/admin';
import { formatTime } from '@/utils/format';

const status = ref('PENDING');
const items = ref<AdminReportItem[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);

const STATUS_TABS = [
  { value: 'PENDING', label: '待处理' },
  { value: 'ACCEPTED', label: '已受理' },
  { value: 'REJECTED', label: '已驳回' },
];

async function load() {
  loading.value = true;
  try {
    const r = await fetchAdminReports(status.value, page.value);
    items.value = r.items;
    total.value = r.total;
  } catch {
    ElMessage.error('举报队列加载失败');
  } finally {
    loading.value = false;
  }
}

async function handle(row: any, action: 'ACCEPTED' | 'REJECTED') {
  let note = '';
  try {
    const { value } = await ElMessageBox.prompt(
      action === 'ACCEPTED' ? '受理后将下架该内容（用户类举报将封禁该用户）' : '驳回后保留该内容',
      action === 'ACCEPTED' ? '受理举报' : '驳回举报',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        inputPlaceholder: '处理备注（会回执给举报人）',
        inputValue: note,
      },
    );
    note = value ?? '';
  } catch {
    return;
  }
  try {
    await handleAdminReport(row.id, action, note || undefined);
    ElMessage.success('已处理，结果将回执给举报人');
    await load();
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '处理失败');
  }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="head-row">
      <h2 class="page-h">举报队列</h2>
      <el-radio-group v-model="status" size="small" @change="page = 1; load()">
        <el-radio-button v-for="t in STATUS_TABS" :key="t.value" :value="t.value">{{ t.label }}</el-radio-button>
      </el-radio-group>
    </div>

    <el-table :data="items" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="类型" width="80">
        <template #default="{ row }">{{ row.targetType === 'POST' ? '帖子' : row.targetType === 'COMMENT' ? '评论' : '用户' }}</template>
      </el-table-column>
      <el-table-column label="举报对象" min-width="220">
        <template #default="{ row }">
          <span>{{ row.target?.label ?? '（已删除）' }}</span>
          <el-tag v-if="row.target?.deleted" size="small" type="danger" style="margin-left: 6px">已删除</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="reason" label="原因" width="110" />
      <el-table-column prop="detail" label="补充说明" min-width="140" show-overflow-tooltip />
      <el-table-column label="举报人" width="120">
        <template #default="{ row }">{{ row.reporter.displayName }}（@{{ row.reporter.username }}）</template>
      </el-table-column>
      <el-table-column label="时间" width="160">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column v-if="status !== 'PENDING'" label="处理备注" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">{{ row.handleNote ?? '—' }}</template>
      </el-table-column>
      <el-table-column v-if="status === 'PENDING'" label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="danger" @click="handle(row, 'ACCEPTED')">受理</el-button>
          <el-button size="small" @click="handle(row, 'REJECTED')">驳回</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > 20"
      class="pager"
      layout="prev, pager, next"
      :total="total"
      :page-size="20"
      :current-page="page"
      @current-change="(p: number) => { page = p; load(); }"
    />
  </div>
</template>

<style scoped>
.head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.page-h {
  margin: 0;
  font-size: var(--tw-fs-title-lg);
  color: var(--tw-ink);
}

.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
