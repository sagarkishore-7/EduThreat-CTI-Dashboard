import { cn } from "@/lib/utils";

/**
 * Design-system card: surface panel with an optional compact header (uppercase
 * micro-title + subtitle on the left, actions on the right). Matches the
 * `.card` / `.card-head` pattern from the Claude Design bundle.
 */
export function Card({
  className,
  children,
  scanline,
}: {
  className?: string;
  children: React.ReactNode;
  scanline?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-800/80 bg-[#10131c]/95 shadow-[0_10px_28px_rgba(0,0,0,0.22)]",
        scanline && "scanline",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHead({
  title,
  sub,
  actions,
  accentDot,
  className,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
  accentDot?: "threat" | "brand" | "pulse";
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-zinc-800/70 px-3.5 py-2.5", className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          {accentDot && <span className={`dot dot-${accentDot}`} />}
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-zinc-100">{title}</span>
        </div>
        {sub && <span className="text-[11px] text-zinc-500">{sub}</span>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("p-3.5", className)}>{children}</div>;
}
