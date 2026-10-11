<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessageBox } from 'element-plus';
import { fetchAdminUsers, updateAdminUser, type AdminUserItem } from '@/api/admin';
import { formatTime } from '@/utils/format';
import { useSessionStore } from '@/stores/session';

const session = useSessionStore();
const isSuper = computed(() => session.user?.role === 'SUPER_ADMIN');

const q = ref('');
const items = ref<AdminUserItem[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    const r = await fetchAdminUsers(q.value, page.value);
    items.value = r.items;
    total.value = r.total;
  } catch {
    ElMessage.error('用户列表加载失败');
  } finally {
    loading.value = false;
  }
}

async function setStatus(row: any, status: 'ACTIVE' | 'BANNED') {
  const label = status === 'BANNED' ? '封禁' : '解封';
  if (status === 'BANNED') {
    try {
      await ElMessageBox.confirm(`确定封禁 @${row.username} 吗？封禁后该用户无法登录。`, '封禁用户', {
        type: 'warning',
        confirmButtonText: '封禁',
        cancelButtonText: '取消',
      });
    } catch {
      return;
    }
  }
  try {
    await updateAdminUser(row.id, { status });
    ElMessage.success(`${label}成功`);
    await load();
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败');
  }
}

async function mute(row: any) {
  let days = 3;
  try {
    const { value } = await ElMessageBox.prompt('禁言天数（到期自动解除）', '禁言用户', {
      confirmButtonText: '禁言',
      cancelButtonText: '取消',
      inputValue: '3',
      inputPattern: /^\d+$/,
      inputErrorMessage: '请输入数字天数',
    });
    days = Number(value);
  } catch {
    return;
  }
  try {
    await updateAdminUser(row.id, { status: 'MUTED', mutedUntil: new Date(Date.now() + days * 86400 * 1000).toISOString() });
    ElMessage.success(`已禁言 ${days} 天`);
    await load();
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败');
  }
}

async function unmute(row: any) {
  try {
    await updateAdminUser(row.id, { status: 'ACTIVE', mutedUntil: null });
    ElMessage.success('已解除禁言');
    await load();
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败');
  }
}

async function changeRole(row: any, role: string) {
  try {
    await updateAdminUser(row.id, { role });
    ElMessage.success('角色已更新');
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
      <h2 class="page-h">用户管理</h2>
      <div class="filters">
        <el-input v-model="q" size="small" placeholder="按用户名 / 昵称 / 邮箱搜索" style="width: 240px" clearable @keyup.enter="page = 1; load()" @clear="page = 1; load()" />
        <el-button size="small" type="primary" plain @click="page = 1; load()">查询</el-button>
      </div>
    </div>

    <el-table :data="items" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="用户" min-width="160">
        <template #default="{ row }">{{ row.displayName }}（@{{ row.username }}）</template>
      </el-table-column>
      <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
      <el-table-column label="认证" width="90">
        <template #default="{ row }">
          <el-tag v-if="row.emailVerified" size="small" type="success">已认证</el-tag>
          <el-tag v-else size="small" type="info">未认证</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="角色" width="150">
        <template #default="{ row }">
          <el-select
            v-if="row.role !== 'SUPER_ADMIN'"
            size="small"
            :model-value="row.role"
            :disabled="!isSuper"
            @change="(v: string) => changeRole(row, v)"
          >
            <el-option label="用户" value="USER" />
            <el-option label="版主" value="MODERATOR" />
          </el-select>
          <el-tag v-else size="small" type="danger">超级管理员</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag v-if="row.status === 'ACTIVE'" size="small">正常</el-tag>
          <el-tag v-else-if="row.status === 'MUTED'" size="small" type="warning">
            禁言{{ row.mutedUntil ? `至 ${formatTime(row.mutedUntil)}` : '' }}
          </el-tag>
          <el-tag v-else size="small" type="danger">已封禁</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="发帖/评论" width="110">
        <template #default="{ row }">{{ row._count.posts }} / {{ row._count.comments }}</template>
      </el-table-column>
      <el-table-column label="注册时间" width="160">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="170" fixed="right">
        <template #default="{ row }">
          <template v-if="row.role !== 'SUPER_ADMIN'">
            <el-button v-if="row.status !== 'BANNED'" size="small" type="danger" @click="setStatus(row, 'BANNED')">封禁</el-button>
            <el-button v-else size="small" type="success" @click="setStatus(row, 'ACTIVE')">解封</el-button>
            <el-button v-if="row.status !== 'MUTED'" size="small" @click="mute(row)">禁言</el-button>
            <el-button v-else size="small" @click="unmute(row)">解禁</el-button>
          </template>
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
}

.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
