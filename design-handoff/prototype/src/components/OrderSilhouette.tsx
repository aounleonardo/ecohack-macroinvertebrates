import paths from '../data/silhouette-paths.json';
import type { Order } from '../data/demo';

/**
 * Fallback art for families without an illustration: a silhouette of their order,
 * drawn from the same outlines as the plates. Inherits colour (currentColor).
 * Default tone is --sil (#4F6E70). Static styled SVGs also live in /art/orders/*.svg.
 */
export function OrderSilhouette({ order, size = 48, title, color = '#4F6E70', opacity = 1 }: { order: Order; size?: number; title?: string; color?: string; opacity?: number }) {
  const g = (paths.orders as Record<string, string>)[order];
  return (
    <svg
      width={size} height={size} viewBox="0 0 240 240" style={{ color, opacity, display: 'block', flex: 'none' }}
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true })}
      dangerouslySetInnerHTML={{ __html: (title ? `<title>${title}</title>` : '') + g.replace(/#FFFDF8/g, 'var(--paper-raised, #FFFDF8)') }}
    />
  );
}
