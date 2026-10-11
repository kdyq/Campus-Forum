<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessageBox } from 'element-plus';
import { addSensitiveWord, fetchSensitiveWords, removeSensitiveWord, type SensitiveWordItem } from '@/api/admin';
import { formatTime } from '@/utils/format';

const items = ref<SensitiveWordItem[]>([]);
const loading = ref(false);
const form = reactive({ word: '', level: 'BLOCK' as 'BLOCK' | 'REVIEW' });
const submitting = ref(false);

async function load() {
  loading.value = true;
  try {
    items.value = await fetchSensitiveWords();
  } catch {
    ElMessage.error('词库加载失败');
  } finally {
    loading.value = false;
  }
}

async function add() {
  const word = form.word.trim();
  if (!word) {
    ElMessage.warning('请输入敏感词');
    return;
  }
  submitting.value = true;
  try {
    await addSensitiveWord(word, form.level);
    ElMessage.success('已添加');
    form.word = '';
    await load();
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '添加失败');
  } finally {
    submitting.value = false;
  }
}

async function remove(row: any) {
  try {
    await ElMessageBox.confirm(`删除敏感词「${row.word}」？`, '删除', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' });
  } catch {
    return;
  }
  try {
    await removeSensitiveWord(row.id);
    ElMessage.success('已删除');
    await load();
  } catch {
    ElMessage.error('删除失败');
  }
}

onMounted(load);
</script>

<template>
  <div>
    <h2 class="page-h">敏感词库</h2>

    <div class="add-row">
      <el-input v-model="form.word" placeholder="输入敏感词" style="width: 240px" maxlength="50" @keyup.enter="add" />
      <el-radio-group v-model="form.level">
        <el-radio-button value="BLOCK">BLOCK · 直接拦截</el-radio-button>
        <el-radio-button value="REVIEW">REVIEW · 转人工审核</el-radio-button>
      </el-radio-group>
      <el-button type="primary" :loading="submitting" @click="add">添加</el-button>
    </div>
    <p class="hint">BLOCK：命中后直接拒绝发布；REVIEW：命中后内容进入审核队列。词库有约 60 秒缓存，新增后稍晚生效。</p>

    <el-table :data="items" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="word" label="词语" min-width="160" />
      <el-table-column label="级别" width="140">
        <template #default="{ row }">
          <el-tag v-if="row.level === 'BLOCK'" size="small" type="danger">BLOCK</el-tag>
          <el-tag v-else size="small" type="warning">REVIEW</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="添加时间" width="180">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button size="small" type="danger" plain @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.page-h {
  margin: 0 0 16px;
  font-size: var(--tw-fs-title-lg);
  color: var(--tw-ink);
}

.add-row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.hint {
  font-size: var(--tw-fs-caption);
  color: var(--tw-ink-3);
  margin: 10px 0 16px;
}
</style>
