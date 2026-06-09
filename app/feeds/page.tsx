"use client";

import { useQuery } from "@tanstack/react-query";
import { getFeedHealth } from "@/lib/api";
import { FeedsSkeleton } from "@/components/ui/Skeleton";
import { Card, CardHead, CardBody } from "@/components/ui/Card";
import { BarList } from "@/components/ui/BarList";
import { formatNumber } from "@/lib/utils";
import { AlertTriangle, Rss, Activity, CheckCircle2, Database } from "lucide-react";

function statusPill(status: string) {
  if (status === "healthy") return <span className="pill pill-clear">Healthy</span>;
  if (status === "stale") return <span className="pill pill-watch">Stale</span>;
  return <span className="pill pill-threat">Offline</span>;
}

function relativeAge(days: number | null): string {
  if (days === null) return "never";
  if (days < 1) return `${Math.round(days * 24)}h ago`;
  return `${Math.round(days)}d ago`;
}

export default function FeedsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["feed-health"],
    queryFn: () => getFeedHealth(60),
    refetchInterval: 60_000,
  });

  if (isLoading) return <FeedsSkeleton />;
  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="ops-panel max-w-lg px-6 py-8 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <h2 className="mb-2 text-lg font-semibold text-zinc-100">Feed health unavailable</h2>
          <p className="text-sm text-zinc-500">The source ingestion endpoint could not be reached.</p>
        </div>
      </div>
    );
  }

  const s = data.summary;
  const kpis = [
    { label: "Active Feeds", value: formatNumber(s.feed_count), icon: Rss, accent: "var(--brand)" },
    { label: "Healthy", value: formatNumber(s.healthy), icon: CheckCircle2, accent: "var(--clear)" },
    { label: "Stale / Offline", value: formatNumber(s.stale + s.offline), icon: Activity, accent: "var(--warn)" },
    { label: "Events (30d)", value: formatNumber(s.events_30d), icon: Database, accent: "var(--pulse)" },
  ];

  const groupBars = data.by_group.map((g) => ({
    name: g.group.toUpperCase(),
    value: g.events,
    color: "var(--pulse)",
  }));

  return (
    <div className="animate-fade-in space-y-3.5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardBody className="py-3">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">{k.label}</span>
                <span className="kpi-icon" style={{ ["--c" as string]: k.accent }}>
                  <k.icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="kpi-val mt-2 text-2xl" style={{ ["--c" as string]: k.accent }}>{k.value}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_1.8fr]">
        <Card>
          <CardHead title="Volume by Source Group" sub="Lifetime events ingested per collector class" />
          <CardBody className="py-2">
            <BarList items={groupBars} color="var(--pulse)" />
          </CardBody>
        </Card>

        <Card>
          <CardHead
            title="Feed Health"
            sub={`${formatNumber(s.feed_count)} sources · ${formatNumber(s.events_total)} lifetime events`}
            accentDot="brand"
          />
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="ops-table text-[12px]">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Class</th>
                    <th className="text-right">Lifetime</th>
                    <th className="text-right">30d</th>
                    <th className="text-right">Last seen</th>
                    <th className="text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.feeds.map((f) => (
                    <tr key={f.source}>
                      <td className="font-medium text-zinc-100">{f.source}</td>
                      <td>
                        <span className="pill pill-mute normal-case tracking-normal">{f.group}</span>
                      </td>
                      <td className="text-right font-mono text-zinc-300">{formatNumber(f.events_total)}</td>
                      <td className="text-right font-mono text-emerald-300">{formatNumber(f.events_30d)}</td>
                      <td className="text-right font-mono text-zinc-500">{relativeAge(f.age_days)}</td>
                      <td className="text-right">{statusPill(f.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Enrichment pipeline chain (static descriptor of the live pipeline stages) */}
      <Card>
        <CardHead title="Enrichment Pipeline" sub="Each collected event flows through the canonical intelligence chain" />
        <CardBody>
          <div className="flex flex-wrap items-center gap-2">
            {["Collect", "Deduplicate", "Fetch article", "LLM enrich", "Canonicalize", "MITRE map", "Publish"].map(
              (stage, i, arr) => (
                <div key={stage} className="flex items-center gap-2">
                  <div className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-[11px] font-medium text-zinc-200">
                    <span className="mr-1.5 font-mono text-emerald-400">{String(i + 1).padStart(2, "0")}</span>
                    {stage}
                  </div>
                  {i < arr.length - 1 && <span className="text-zinc-600">→</span>}
                </div>
              ),
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
