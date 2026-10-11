<script setup lang="ts">
// 举报对话框：选择原因 + 补充说明
import { reactive, ref, watch } from 'vue';
import { createReport, fetchReportReasons } from '@/api/admin';

const props = defineProps<{
  visible: boolean;
  targetType: 'POST' | 'COMMENT' | 'USER';
  targetId: number;
  targetLabel?: string;
}>();

const emit = defineEmits<{ 'update:visible': [v: boolean]; reported: [] }>();

const reasons = ref<string[]>(['垃圾广告', '人身攻击', '违法违规', '色情低俗', '引战谩骂', '侵权', '其他']);
const form = reactive({ reason: '', detail: '' });
const submitting = ref(false);

watch(
  () => props.visible,
  async (v) => {
    if (v) {
      form.reason = '';
      form.detail = '';
      try {
        reasons.value = await fetchReportReasons();
      } catch {
        /* 用默认原因列表 */
      }
    }
  },
);

async function submit() {
  if (!form.reason) {
    ElMessage.warning('请选择举报原因');
    return;
  }
  submitting.value = true;
  try {
    await createReport({ targetType: props.targetType, targetId: props.targetId, reason: form.reason, detail: form.detail || undefined });
    ElMessage.success('举报已提交，处理结果会通过站内通知告知你');
    emit('update:visible', false);
    emit('reported');
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '举报提交失败');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="举报内容"
    width="440px"
    :close-on-click-modal="true"
    @update:model-value="emit('update:visible', $event)"
  >
    <p v-if="targetLabel" class="report-target">举报对象：{{ targetLabel }}</p>
    <el-form label-position="top">
      <el-form-item label="举报原因">
        <el-select v-model="form.reason" placeholder="选择原因" style="width: 100%">
          <el-option v-for="r in reasons" :key="r" :label="r" :value="r" />
        </el-select>
      </el-form-item>
      <el-form-item label="补充说明（选填）">
        <el-input v-model="form.detail" type="textarea" :rows="3" maxlength="500" show-word-limit placeholder="补充具体情况，便于管理员判断" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">提交举报</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.report-target {
  margin: 0 0 12px;
  font-size: var(--tw-fs-caption);
  color: var(--tw-ink-2);
  background: var(--tw-surface-2);
  border-radius: var(--tw-r-ctrl);
  padding: 8px 12px;
}
</style>
