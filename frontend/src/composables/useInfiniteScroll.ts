// 无限滚动：IntersectionObserver（规范禁止 window scroll 监听）
import { onMounted, onUnmounted, ref } from 'vue';

export function useInfiniteScroll(onReach: () => void, options: { rootMargin?: string } = {}) {
  const sentinelRef = ref<HTMLElement | null>(null);
  const active = ref(true);
  let io: IntersectionObserver | null = null;

  function start(): void {
    stop();
    io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && active.value) onReach();
      },
      { rootMargin: options.rootMargin ?? '240px' },
    );
    if (sentinelRef.value) io.observe(sentinelRef.value);
  }

  function stop(): void {
    io?.disconnect();
    io = null;
  }

  onMounted(start);
  onUnmounted(stop);

  return { sentinelRef, active };
}
