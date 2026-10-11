<script setup lang="ts">
// 投票框：展示 + 投票（单选/多选），结果百分比条
import { computed, ref } from 'vue';
import { api, post } from '@/api/client';
import { useSessionStore } from '@/stores/session';
import { formatTime } from '@/utils/format';

export interface PollView {
  id: number;
  question: string;
  multiple: boolean;
  closed: boolean;
  closesAt: string | null;
  options: { id: number; text: string; count: number; percent: number }[];
  totalVotes: number;
  myChoices: number[];
}

const props = defineProps<{ poll: PollView }>();
const session = useSessionStore();

const choices = ref<number[]>([...props.poll.myChoices]);
const voted = ref(props.poll.myChoices.length > 0);
const submitting = ref(false);

const canVote = computed(() => session.user?.emailVerified && !props.poll.closed);

function pick(optionId: number) {
  if (!canVote.value || voted.value) return;
  if (props.poll.multiple) {
    const i = choices.value.indexOf(optionId);
    if (i >= 0) choices.value.splice(i, 1);
    else choices.value.push(optionId);
  } else {
    choices.value = [optionId];
  }
}

async function submit() {
  if (choices.value.length === 0) {
    ElMessage.warning('请先选择一个选项');
    return;
  }
  submitting.value = true;
  try {
    const result = await post<PollView>(`/polls/${props.poll.id}/vote`, { choices: choices.value });
    choices.value = [...result.myChoices];
    voted.value = true;
    Object.assign(props.poll, result);
    ElMessage.success('投票成功');
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '投票失败');
  } finally {
    submitting.value = false;
  }
}

async function revoke() {
  try {
    await api.delete(`/polls/${props.poll.id}/vote`).catch(() => undefined);
  } catch {
    /* 后端未提供撤销：本地仅作展示回退 */
  }
}
void revoke;
</script>

<template>
  <section class="poll-box">
    <header class="poll-head">
      <span class="poll-mark">投票</span>
      <span class="poll-question">{{ poll.question }}</span>
      <span class="tw-meta">{{ poll.multiple ? '多选' : '单选' }} · {{ poll.totalVotes }} 人参与</span>
      <span v-if="poll.closed" class="closed-mark">已截止</span>
    </header>
    <div class="poll-options">
      <button
        v-for="opt in poll.options"
        :key="opt.id"
        type="button"
        class="poll-option"
        :class="{ picked: choices.includes(opt.id) && !voted, chosen: poll.myChoices.includes(opt.id) && voted }"
        :disabled="!canVote || voted"
        :aria-pressed="choices.includes(opt.id)"
        @click="pick(opt.id)"
      >
        <span class="opt-text">{{ opt.text }}</span>
        <span v-if="voted || poll.closed" class="opt-result">
          <span class="opt-bar" :style="{ width: `${opt.percent}%` }"></span>
          <span class="opt-pct tw-meta">{{ opt.percent }}%（{{ opt.count }}）</span>
        </span>
      </button>
    </div>
    <footer class="poll-foot">
      <template v-if="!voted && canVote">
        <el-button type="primary" size="small" :loading="submitting" @click="submit">投票</el-button>
        <span class="tw-meta">{{ poll.closesAt ? `截止于 ${formatTime(poll.closesAt)}` : '长期有效' }}</span>
      </template>
      <template v-else-if="voted">
        <span class="voted-tip tw-meta">已参与投票{{ poll.closed ? ' · 投票已截止' : '' }}</span>
      </template>
      <template v-else>
        <span class="voted-tip tw-meta">登录并完成验证后可参与投票</span>
      </template>
    </footer>
  </section>
</template>

<style scoped>
.poll-box {
  border: 1px solid var(--tw-line);
  background: var(--tw-surface-2);
  border-radius: var(--tw-r-card);
  padding: 16px 18px;
  margin: 16px 0;
}

.poll-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.poll-mark {
  font-size: 11px;
  font-weight: 700;
  color: var(--tw-btn-on-accent);
  background: var(--tw-accent);
  border-radius: var(--tw-r-badge);
  padding: 2px 7px;
}

.poll-question {
  font-weight: 600;
  color: var(--tw-ink);
  font-size: var(--tw-fs-body);
}

.closed-mark {
  font-size: 11px;
  color: var(--tw-ink-3);
}

.poll-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.poll-option {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 40px;
  padding: 8px 14px;
  border: 1px solid var(--tw-line);
  border-radius: var(--tw-r-ctrl);
  background: var(--tw-surface);
  text-align: left;
  overflow: hidden;
  transition: border-color var(--tw-dur-fast) var(--tw-ease-out);
}

.poll-option:not(:disabled):hover {
  border-color: var(--tw-accent);
}

.poll-option.picked,
.poll-option.chosen {
  border-color: var(--tw-accent);
  background: var(--tw-accent-soft);
}

.poll-option:disabled {
  cursor: default;
}

.opt-text {
  position: relative;
  z-index: 1;
  font-size: var(--tw-fs-body-sm);
  color: var(--tw-ink);
}

.opt-result {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.opt-bar {
  display: block;
  height: 6px;
  min-width: 2px;
  border-radius: var(--tw-r-pill);
  background: var(--tw-accent);
  opacity: 0.55;
}

.opt-pct {
  flex: none;
}

.poll-foot {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.voted-tip {
  font-size: 12px;
}
</style>
