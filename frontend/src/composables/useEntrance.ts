// 页面入场动效（设计规范 §5.2）：gsap.context + matchMedia 降级，只动 transform/opacity
import gsap from 'gsap';
import { onMounted, onUnmounted, type Ref } from 'vue';

export interface EntranceSelectors {
  tree: string;
  sortbar?: string;
  title?: string;
  body?: string;
  items: string;
  panels: string;
}

export function useEntrance(rootRef: Ref<HTMLElement | null>, selectors: EntranceSelectors): void {
  let ctx: gsap.Context | null = null;

  onMounted(() => {
    if (!rootRef.value) return;
    ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ defaults: { duration: 0.45, ease: 'power3.out' } });
        if (selectors.tree) tl.from(selectors.tree, { x: -10, opacity: 0 }, 0);
        if (selectors.sortbar) tl.from(selectors.sortbar, { y: -6, opacity: 0, duration: 0.35 }, 0.15);
        if (selectors.title) tl.from(selectors.title, { y: 8, opacity: 0, duration: 0.5 }, 0);
        if (selectors.body) tl.from(selectors.body, { y: 8, opacity: 0, duration: 0.5 }, 0.1);
        tl.from(selectors.items, { y: 12, opacity: 0, stagger: 0.045 }, 0.2);
        tl.from(selectors.panels, { y: 10, opacity: 0, stagger: 0.08 }, 0.3);
      });
    }, rootRef.value);
  });

  onUnmounted(() => {
    ctx?.revert();
    ctx = null;
  });
}
