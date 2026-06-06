import Link from "next/link";
import { formatNumber } from "@/lib/utils";

export interface BarItem {
  name: string;
  value: number;
  meta?: string;
  href?: string;
  color?: string;
}

/**
 * Ranked horizontal bar list (top actors, attack-category mix, etc.).
 * Each row shows a label, a mono value, and a normalized fill bar.
 */
export function BarList({ items, color = "var(--brand)" }: { items: BarItem[]; color?: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="px-1">
      {items.map((item) => {
        const row = (
          <div className="bar-row" style={{ ["--c" as string]: item.color || color }}>
            <div className="min-w-0">
              <div className="bar-name">{item.name}</div>
              {item.meta && <div className="bar-meta">{item.meta}</div>}
            </div>
            <div className="bar-val">{formatNumber(item.value)}</div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
          </div>
        );
        return item.href ? (
          <Link key={item.name} href={item.href} className="block hover:bg-[#161a26] rounded px-2 -mx-1">
            {row}
          </Link>
        ) : (
          <div key={item.name} className="px-2 -mx-1">
            {row}
          </div>
        );
      })}
    </div>
  );
}
