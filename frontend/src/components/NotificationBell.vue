<script setup lang="ts">
// 通知铃铛（设计规范 §4.4 通知角标）：有未读显示胶囊角标，新通知数字弹跳
import { onMounted, watch } from 'vue';
import { useNotificationStore } from '@/stores/notification';
import { useSessionStore } from '@/stores/session';

const props = defineProps<{ variant?: 'icon' | 'plain' }>();
const store = useNotificationStore();
const session = useSessionStore();

onMounted(() => {
  if (session.user) void store.refresh();
});

watch(
  () => session.user?.id,
  (id) => {
    if (id) void store.refresh();
  },
);

const badgeText = () => (store.unread > 99 ? '99+' : String(store.unread));
</script>

<template>
  <RouterLink to="/notifications" class="bell" :class="{ plain: props.variant === 'plain' }" aria-label="消息通知">
    <span class="bell-ico" aria-hidden="true">🔔</span>
    <Transition name="pop">
      <span v-if="store.unread > 0" class="badge" aria-live="polite">{{ badgeText() }}</span>
    </Transition>
  </RouterLink>
</template>

<style scoped>
.bell {
  position: relative;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: var(--tw-r-ctrl);
  color: var(--tw-ink-2);
  transition: background var(--tw-dur-fast) var(--tw-ease-out), color var(--tw-dur-fast) var(--tw-ease-out);
}

.bell:hover {
  background: var(--tw-surface-2);
  color: var(--tw-ink);
}

.bell-ico {
  font-size: 17px;
  line-height: 1;
}

.badge {
  position: absolute;
  top: 4px;
  right: 3px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: var(--tw-r-pill);
  background: var(--tw-danger);
  color: #fff;
  font-size: 10.5px;
  font-weight: 700;
  font-family: var(--tw-font-mono);
  display: grid;
  place-items: center;
  line-height: 1;
}

.pop-enter-active {
  animation: badge-pop 0.22s var(--tw-ease-out);
}

@keyframes badge-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .pop-enter-active {
    animation: none;
  }
}
</style>
