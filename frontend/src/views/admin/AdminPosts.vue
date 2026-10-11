<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessageBox } from 'element-plus';
import { useRoute } from 'vue-router';
import { fetchAdminPosts, postAdminAction, type AdminPostItem } from '@/api/admin';
import { formatTime } from '@/utils/format';

const route = useRoute();
const status = ref(String(route.query.status ?? ''));
const q = ref('');
const items = ref<AdminPostItem[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'NORMAL', label: '正常' },
  { value: 'SOLVED', label: '已解决' },
  { value: 'LOCKED', label: '已锁定' },
  { value: 'PENDING', label: '待审核' },
  { value: 'REMOVED', label: '已下架/删除' },
];

async function load() {
  loading.value = true;
  try {
    const r = await fetchAdminPosts({ status: status.value || undefined, q: q.value || undefined, page: page.value });
    items.value = r.items;
    total.value = r.total;
  } catch {
    ElMessage.error('内容列表加载失败');
  } finally {
    loading.value = false;
  }
}

async function action(row: any, act: string, tip?: string) {
  if (act === 'REMOVE') {
    try {
      await ElMessageBox.confirm(`确定下架「${row.title}」吗？下架后前台不可见，可从回收站恢复。`, '下架内容', { type: 'warning', confirmButtonText: '下架', cancelButtonText: '取消' });
    } catch {
      return;
    }
  }
  try {
    await postAdminAction(row.id, act);
    ElMessage.success(tip ?? '操作成功');
    await load();
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败');
  }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="head-row">
      <h2 class="page-h">内容管理</h2>
      <div class="filters">
        <el-select v-model="status" size="small" style="width: 140px" @change="page = 1; load()">
          <el-option v-for="o in STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
        <el-input v-model="q" size="small" placeholder="按标题搜索" style="width: 200px" clearable @keyup.enter="page = 1; load()" @clear="page = 1; load()" />
        <el-button size="small" type="primary" plain @click="page = 1; load()">查询</el-button>
      </div>
    </div>

    <el-table :data="items" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="title" label="标题" min-width="240" show-overflow-tooltip />
      <el-table-column label="作者" width="130">
        <template #default="{ row }">
          {{ row.author.displayName }}
          <el-tag v-if="row.isAnonymous" size="small" style="margin-left: 4px">匿名</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="board.name" label="板块" width="90" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag v-if="row.status === 'NORMAL'" size="small">正常</el-tag>
          <el-tag v-else-if="row.status === 'SOLVED'" size="small" type="success">已解决</el-tag>
          <el-tag v-else-if="row.status === 'LOCKED'" size="small" type="info">已锁定</el-tag>
          <el-tag v-else-if="row.status === 'PENDING'" size="small" type="warning">待审核</el-tag>
          <el-tag v-else size="small" type="danger">已下架</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="数据" width="150">
        <template #default="{ row }">
          <span class="tw-meta">浏览{{ row.viewCount }} 赞{{ row.likeCount }} 评{{ row.commentCount }}</span>
        </template>
      </el-table-column>
      <el-table-column label="发布时间" width="160">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="270" fixed="right">
        <template #default="{ row }">
          <el-button v-if="!row.isPinned" size="small" @click="action(row, 'PIN', '已置顶')">置顶</el-button>
          <el-button v-else size="small" @click="action(row, 'UNPIN', '已取消置顶')">取消置顶</el-button>
          <el-button v-if="!row.isFeatured" size="small" @click="action(row, 'FEATURE', '已加精')">加精</el-button>
          <el-button v-else size="small" @click="action(row, 'UNFEATURE', '已取消加精')">取消加精</el-button>
          <el-button v-if="row.status === 'PENDING'" size="small" type="success" @click="action(row, 'APPROVE', '已通过审核')">通过</el-button>
          <el-button v-if="row.status !== 'LOCKED' && row.status !== 'REMOVED'" size="small" @click="action(row, 'LOCK', '已锁定')">锁定</el-button>
          <el-button v-if="row.status === 'REMOVED'" size="small" type="success" @click="action(row, 'RESTORE', '已恢复')">恢复</el-button>
          <el-button v-else-if="row.status !== 'PENDING'" size="small" type="danger" @click="action(row, 'REMOVE')">下架</el-button>
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
  gap: 12px;
  flex-wrap: wrap;
}

.page-h {
  margin: 0;
  font-size: var(--tw-fs-title-lg);
  color: var(--tw-ink);
}

.filters {
  display: flex;
  gap: 8px;
  align-items: center;
}

.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
