import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

/* ──────────────────────────────────────────────────────────────────────────
 * Loading skeletons.
 *
 * Primitives (SkeletonBlock/Text/Header/KpiRow/Card/Table/Chart/Graph/List) are
 * composed into per-page "archetype" skeletons that mirror each page's real
 * layout, so the loading state matches the page that then renders instead of a
 * generic placeholder. Reuses the `.skeleton` shimmer class from globals.css.
 * ────────────────────────────────────────────────────────────────────────── */

/** Base shimmer block. */
export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} />;
}

/** A stack of text lines (last line shorter). */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/** Page header block — mirrors <PageHeader> (ops-shell). */
export function SkeletonHeader({ controls = false }: { controls?: boolean }) {
  return (
    <div className="ops-shell relative overflow-hidden p-5 md:p-6">
      <SkeletonBlock className="h-3 w-24" />
      <SkeletonBlock className="mt-3 h-6 w-64 max-w-[70%]" />
      <SkeletonBlock className="mt-2.5 h-3 w-full max-w-2xl" />
      {controls && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-800/60 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-7 w-24" />
          ))}
        </div>
      )}
    </div>
  );
}

/** Row of KPI tiles. */
export function SkeletonKpiRow({ n = 4 }: { n?: number }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 auto-rows-fr", n >= 5 ? "md:grid-cols-5" : "md:grid-cols-4")}>
      {Array.from({ length: n }).map((_, i) => (
        <Card key={i} className="min-w-0 p-4">
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-2.5 w-16" />
            <SkeletonBlock className="h-6 w-6 rounded-md" />
          </div>
          <SkeletonBlock className="mt-3 h-7 w-20" />
          <SkeletonBlock className="mt-3 h-2.5 w-24" />
        </Card>
      ))}
    </div>
  );
}

/** Card with a header bar and body lines. */
export function SkeletonCard({
  className,
  lines = 4,
  bodyClass,
}: {
  className?: string;
  lines?: number;
  bodyClass?: string;
}) {
  return (
    <Card className={cn("min-w-0 overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b border-zinc-800/70 px-3.5 py-2.5">
        <div className="space-y-1.5">
          <SkeletonBlock className="h-3 w-32" />
          <SkeletonBlock className="h-2.5 w-20" />
        </div>
        <SkeletonBlock className="h-6 w-16" />
      </div>
      <div className={cn("p-3.5", bodyClass)}>
        <SkeletonText lines={lines} />
      </div>
    </Card>
  );
}

/** Table card — header row + body rows. */
export function SkeletonTable({ rows = 9, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-800/70 px-3.5 py-2.5">
        <SkeletonBlock className="h-3 w-40" />
        <SkeletonBlock className="h-6 w-24" />
      </div>
      <div className="divide-y divide-zinc-800/60">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-3 px-3.5 py-3">
            {Array.from({ length: cols }).map((_, c) => (
              <SkeletonBlock key={c} className={cn("h-3.5", c === 0 ? "flex-[2]" : "flex-1")} />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Chart card — header + a tall plot placeholder. */
export function SkeletonChart({ heightClass = "h-[240px]" }: { heightClass?: string }) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="border-b border-zinc-800/70 px-3.5 py-2.5">
        <SkeletonBlock className="h-3 w-36" />
      </div>
      <div className="p-3.5">
        <SkeletonBlock className={cn("w-full rounded-lg", heightClass)} />
      </div>
    </Card>
  );
}

/** List/feed rows. */
export function SkeletonList({ rows = 8 }: { rows?: number }) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="divide-y divide-zinc-800/60">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-3.5 py-2.5">
            <div className="mb-1.5 flex items-center gap-2">
              <SkeletonBlock className="h-4 w-12 rounded" />
              <SkeletonBlock className="h-3 w-40 max-w-[55%]" />
              <SkeletonBlock className="ml-auto h-2.5 w-10" />
            </div>
            <SkeletonBlock className="h-2.5 w-3/4" />
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── Archetype skeletons (one per page shape) ───────────────────────────── */

export function DashboardSkeleton() {
  return (
    <div className="space-y-3.5">
      <SkeletonBlock className="h-11 w-full" />
      <SkeletonKpiRow n={4} />
      <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr]">
        <SkeletonBlock className="h-[420px] w-full rounded-lg" />
        <SkeletonList rows={6} />
      </div>
      <SkeletonCard lines={3} />
      <div className="grid gap-3 xl:grid-cols-[1.7fr_1fr_1fr]">
        <SkeletonChart />
        <SkeletonCard lines={6} />
        <SkeletonCard lines={6} />
      </div>
    </div>
  );
}

// `header` mirrors whether the real page renders a <PageHeader> — several pages
// (mitre, campaigns, reports, feeds, investigations, intel-graph, incidents) have
// none, so their skeleton must not show a phantom header block.

export function TableSkeleton({
  header = true,
  filters = true,
  rows = 10,
}: {
  header?: boolean;
  filters?: boolean;
  rows?: number;
}) {
  return (
    <div className="space-y-4">
      {header && <SkeletonHeader controls={filters} />}
      <SkeletonKpiRow n={4} />
      <SkeletonTable rows={rows} />
    </div>
  );
}

export function GraphSkeleton({
  header = true,
  filters = true,
  table = false,
}: {
  header?: boolean;
  filters?: boolean;
  table?: boolean;
}) {
  return (
    <div className="space-y-4">
      {header && <SkeletonHeader controls />}
      <Card className="min-w-0 overflow-hidden">
        {filters && (
          <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800/70 px-4 py-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-6 w-20" />
            ))}
          </div>
        )}
        <div className="grid xl:grid-cols-[1fr_300px]">
          <SkeletonBlock className="h-[560px] w-full rounded-none" />
          <div className="space-y-3 border-t border-zinc-800/70 p-4 xl:border-l xl:border-t-0">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonText lines={5} />
          </div>
        </div>
      </Card>
      {table && <SkeletonTable rows={8} />}
    </div>
  );
}

export function SplitSkeleton({ header = false }: { header?: boolean }) {
  return (
    <div className="space-y-3.5">
      {header && <SkeletonHeader />}
      <SkeletonKpiRow n={4} />
      <div className="grid gap-3 xl:grid-cols-[1fr_1.25fr]">
        <SkeletonList rows={8} />
        <SkeletonCard lines={10} />
      </div>
    </div>
  );
}

export function ChartsSkeleton({
  header = true,
  kpis = 4,
  charts = 4,
}: {
  header?: boolean;
  kpis?: number;
  charts?: number;
}) {
  return (
    <div className="space-y-4">
      {header && <SkeletonHeader controls />}
      <SkeletonKpiRow n={kpis} />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: charts }).map((_, i) => (
          <SkeletonChart key={i} />
        ))}
      </div>
    </div>
  );
}

/** MITRE: KPI row + a tactics bar block + one full-width matrix (not 2×2 charts). */
export function MatrixSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonKpiRow n={4} />
      <Card className="min-w-0 overflow-hidden">
        <div className="border-b border-zinc-800/70 px-3.5 py-2.5">
          <SkeletonBlock className="h-3 w-40" />
        </div>
        <div className="space-y-2 p-3.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-4 w-full" />
          ))}
        </div>
      </Card>
      <SkeletonChart heightClass="h-[320px]" />
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonHeader controls />
      <SkeletonKpiRow n={5} />
      <SkeletonBlock className="h-[520px] w-full rounded-2xl" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} lines={4} />
        ))}
      </div>
    </div>
  );
}

export function CardsSkeleton({ header = true, count = 6 }: { header?: boolean; count?: number }) {
  return (
    <div className="space-y-4">
      {header && <SkeletonHeader />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} lines={5} />
        ))}
      </div>
    </div>
  );
}

/** Reports: a template-row card + a 2-col (bulletins / advisories) split. */
export function ReportsSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="min-w-0 overflow-hidden">
        <div className="border-b border-zinc-800/70 px-3.5 py-2.5">
          <SkeletonBlock className="h-3 w-40" />
        </div>
        <div className="grid gap-2.5 p-3.5 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-16" />
          ))}
        </div>
      </Card>
      <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr]">
        <SkeletonCard lines={8} />
        <SkeletonCard lines={8} />
      </div>
    </div>
  );
}

/** Feeds: KPI row + a 2-col (bar-list card / table card). */
export function FeedsSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonKpiRow n={4} />
      <div className="grid gap-3 xl:grid-cols-[1fr_1.8fr]">
        <SkeletonCard lines={7} />
        <SkeletonTable rows={9} />
      </div>
    </div>
  );
}
