import paths from "../lib/silhouette-paths.json";
import type { Order } from "../lib/families";

/**
 * Fallback art for families without a plate: their order's silhouette, drawn from the
 * same outlines as the illustrations. Inherits colour. Static styled SVGs: /art/orders/*.svg
 */
export function OrderSilhouette({ order, size = 48, title, color = "#4F6E70", opacity = 1 }: { order: Order; size?: number; title?: string; color?: string; opacity?: number }) {
  const g = (paths.orders as Record<string, string>)[order];
  return (
    <svg
      width={size} height={size} viewBox="0 0 240 240" style={{ color, opacity, display: "block", flex: "none" }}
      {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}
      dangerouslySetInnerHTML={{ __html: g.replace(/#FFFDF8/g, "var(--paper-raised, #FFFDF8)") }}
    />
  );
}
