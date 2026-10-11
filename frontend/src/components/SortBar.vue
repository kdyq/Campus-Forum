<script setup lang="ts">
// 排序条（设计规范 §4.2）：自定义胶囊按钮组，role=tablist
const props = defineProps<{
  modelValue: string;
  options: { value: string; label: string }[];
}>();
const emit = defineEmits<{ update: [value: string] }>();

function onSelect(v: string) {
  if (v !== props.modelValue) emit('update', v);
}
</script>

<template>
  <div class="sortbar" role="tablist" aria-label="排序方式">
    <button
      v-for="opt in options"
      :key="opt.value"
      role="tab"
      type="button"
      class="sort"
      :class="{ on: opt.value === modelValue }"
      :aria-selected="opt.value === modelValue"
      @click="onSelect(opt.value)"
    >
      {{ opt.label }}
    </button>
    <div class="spacer"></div>
    <slot />
  </div>
</template>

<style scoped>
.sortbar {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
}

.sort {
  height: 32px;
  padding: 0 12px;
  border-radius: var(--tw-r-ctrl);
  font-size: 13.5px;
  color: var(--tw-ink-2);
  transition: background var(--tw-dur-fast) var(--tw-ease-out), color var(--tw-dur-fast) var(--tw-ease-out);
}

.sort:hover {
  background: var(--tw-surface-2);
  color: var(--tw-ink);
}

.sort.on {
  background: var(--tw-surface);
  color: var(--tw-accent);
  font-weight: 600;
  box-shadow: var(--tw-e1);
}

.spacer {
  flex: 1;
}
</style>
