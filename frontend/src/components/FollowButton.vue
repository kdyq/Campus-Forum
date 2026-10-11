<script setup lang="ts">
// 关注按钮：用户 / 标签 目标，乐观切换
import { onMounted, ref } from 'vue';
import { api, post } from '@/api/client';
import { useSessionStore } from '@/stores/session';

const props = defineProps<{
  targetType: 'USER' | 'TAG' | 'COURSE';
  targetId: number;
}>();

const session = useSessionStore();
const following = ref(false);
const busy = ref(false);

onMounted(async () => {
  if (!session.user || session.user.id === props.targetId) return;
  try {
    const { data } = await api.get(`/follows/state/${props.targetType}/${props.targetId}`);
    following.value = data?.data?.following ?? false;
  } catch {
    /* 忽略 */
  }
});

async function toggle() {
  if (!session.user) {
    ElMessage.warning('登录后即可关注');
    return;
  }
  if (busy.value) return;
  busy.value = true;
  const prev = following.value;
  following.value = !prev;
  try {
    if (prev) {
      await api.delete(`/follows/${props.targetType}/${props.targetId}`);
    } else {
      await post(`/follows`, { targetType: props.targetType, targetId: props.targetId });
    }
    following.value = !prev;
  } catch (e) {
    following.value = prev;
    ElMessage.error(e instanceof Error ? e.message : '操作失败');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <el-button
    size="small"
    :type="following ? 'default' : 'primary'"
    :plain="following"
    :loading="busy"
    @click="toggle"
  >
    {{ following ? '已关注' : '关注' }}
  </el-button>
</template>
