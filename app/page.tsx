"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RecentIncidentsList } from "@/components/RecentIncidentsList";
import { PageHeader, PageSkeleton } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { getDashboard } from "@/lib/api";
import { cn, formatDate, formatNumber, formatPercent, getCountryFlag } from "@/lib/utils";
import {
  AlertTriangle,
  Database,
  Link2,
  Lock,
  Radar,
  Shield,
  Users,
} from "lucide-react";

const IncidentTimeChart = dynamic(
  () => import("@/components/charts/IncidentTimeChart").then((m) => m.IncidentTimeChart),
  { ssr: false },
);

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    refetchInterval: 60_000,
  });

  if (isLoading) return <PageSkeleton rows={4} />;

  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <h2 className="mb-1 text-base font-semibold text-zinc-200">Connection Failed</h2>
          <p className="text-sm text-zinc-600">Unable to reach the v2 API.</p>
        </div>
      </div>
    );
  }

  const { stats, incidents_over_time, recent_incidents, intelligence_summary: intel } = data;
  const findings = intel.priority_findings.slice(0, 4);
  const victimSegments = intel.victimology.institution_segments.slice(0, 5);
  const topCountries = intel.victimology.top_countries.slice(0, 6);
  const attackClusters = intel.tradecraft.attack_clusters.slice(0, 6);
  const attackVectors = intel.tradecraft.attack_vectors.slice(0, 6);
  const topActors = intel.attribution.top_threat_actors.slice(0, 6);
  const largestRecordEvents = intel.exposure.largest_record_events.slice(0, 5);
  const recentChangePct = intel.tempo.recent_change_pct;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={Radar}
        label="Executive Briefing"
        title="Education-Sector Threat Briefing"
        description={`Analyst-first view of the open canonical dataset, refreshed ${formatDate(stats.last_updated)} from the v2 Postgres intelligence layer.`}
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <BriefStat
            label="Recent 90 Days"
            value={formatNumber(intel.tempo.recent_90d_count)}
            detail={
              intel.tempo.recent_change_pct === null
                ? "No prior comparison window yet"
                : `${intel.tempo.recent_change_count >= 0 ? "+" : ""}${intel.tempo.recent_change_count} vs prior 90-day window`
            }
          />
          <BriefStat
            label="Ransomware Share"
            value={formatPercent(intel.overview.ransomware_share)}
            detail={`${formatNumber(intel.overview.ransomware_count)} canonicals`}
          />
          <BriefStat
            label="Actor Attribution"
            value={formatPercent(intel.overview.actor_attributed_share)}
            detail={`${formatNumber(intel.overview.actor_attributed_count)} incidents with named actors`}
          />
          <BriefStat
            label="Known Record-Loss Events"
            value={formatNumber(intel.exposure.known_record_events)}
            detail={`${formatNumber(intel.exposure.known_record_volume)} known records in exact-count cases`}
          />
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard
          title="Open Canonicals"
          value={stats.education_incidents}
          description="Education incidents retained in the public canonical set"
          icon={Shield}
          variant="primary"
          href="/incidents"
        />
        <StatCard
          title="Ransomware Pressure"
          value={formatPercent(intel.overview.ransomware_share)}
          description="Share of canonicals tied to ransomware or extortion patterns"
          icon={Lock}
          variant="danger"
          href="/ransomware"
        />
        <StatCard
          title="Attributed Actors"
          value={formatPercent(intel.overview.actor_attributed_share)}
          description="Canonicals with a named actor attached in the current dataset"
          icon={Users}
          variant="purple"
          href="/threat-actors"
        />
        <StatCard
          title="Vendor Exposure"
          value={formatPercent(intel.overview.vendor_linked_share)}
          description="Incidents that look vendor-mediated or supply-chain driven"
          icon={Link2}
          variant="warning"
          href="/analytics"
        />
        <StatCard
          title="Breach Signals"
          value={formatPercent(intel.overview.breach_share)}
          description="Canonicals tagged as breach or external data exposure"
          icon={Database}
          variant="success"
          href="/analytics"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <BriefPanel
          eyebrow="Analyst Findings"
          title="What stands out in the retained dataset"
          description="These are the first pivots I would use in a threat briefing before drilling into individual incidents."
        >
          <div className="grid gap-3 md:grid-cols-2">
            {findings.map((finding) => (
              <div
                key={finding.title}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
              >
                <p className="section-label mb-2">{finding.title}</p>
                <h3 className="text-lg font-semibold text-zinc-100">{finding.value}</h3>
                <p className="mt-2 text-sm text-zinc-500">{finding.context}</p>
              </div>
            ))}
          </div>
        </BriefPanel>

        <div className="space-y-4">
          <BriefPanel
            eyebrow="Tempo"
            title="Recent pressure"
            description="Rolling 90-day incident tempo based on canonical incident dates."
          >
            <div className="grid grid-cols-2 gap-3">
              <MiniMetric
                label="Recent 90 Days"
                value={formatNumber(intel.tempo.recent_90d_count)}
              />
              <MiniMetric
                label="Prior 90 Days"
                value={formatNumber(intel.tempo.prior_90d_count)}
              />
              <MiniMetric
                label="Ransomware in Window"
                value={formatNumber(intel.tempo.recent_ransomware_count)}
              />
              <MiniMetric
                label="Vendor-Linked in Window"
                value={formatNumber(intel.tempo.recent_vendor_count)}
              />
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              {recentChangePct == null
                ? "A prior 90-day comparison window is not populated yet."
                : `Recent tempo is ${formatPercent(Math.abs(recentChangePct))} ${intel.tempo.recent_change_count >= 0 ? "higher" : "lower"} than the preceding 90-day window.`}
            </p>
          </BriefPanel>

          <BriefPanel
            eyebrow="Coverage"
            title="How much depth we have"
            description="Useful context for what the public dashboard can say confidently today."
          >
            <div className="space-y-3">
              <BarRow
                label="Named attack vector"
                value={formatPercent(intel.coverage.attack_vector_known_share)}
                width={intel.coverage.attack_vector_known_share}
              />
              <BarRow
                label="Named threat actor"
                value={formatPercent(intel.coverage.attribution_known_share)}
                width={intel.coverage.attribution_known_share}
                tone="violet"
              />
              <BarRow
                label="Exact record-loss count"
                value={formatPercent(intel.coverage.record_loss_known_share)}
                width={intel.coverage.record_loss_known_share}
                tone="emerald"
              />
            </div>
          </BriefPanel>
        </div>
      </div>

      <IncidentTimeChart data={incidents_over_time} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <BriefPanel
          eyebrow="Victimology"
          title="Who is being hit"
          description="Macro victim segmentation plus the countries showing the most retained activity."
        >
          <div className="space-y-4">
            <div className="space-y-2">
              {victimSegments.map((segment) => (
                <BarRow
                  key={segment.segment}
                  label={segment.segment}
                  value={`${formatNumber(segment.count)} · ${formatPercent(segment.percentage)}`}
                  width={segment.percentage}
                />
              ))}
            </div>
            <div className="divider pt-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-300">Most affected countries</p>
                <Link href="/map" className="text-xs text-cyan-400 hover:text-cyan-300">
                  Open geography view
                </Link>
              </div>
              <div className="space-y-2">
                {topCountries.map((country) => (
                  <Link
                    key={`${country.category}-${country.country_code}`}
                    href={`/incidents?country=${encodeURIComponent(country.category)}`}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 transition-colors hover:border-cyan-500/30 hover:bg-zinc-800/50"
                  >
                    <span className="text-sm text-zinc-200">
                      {getCountryFlag(country.country_code || country.category, country.flag_emoji)} {country.category}
                    </span>
                    <span className="font-mono text-cyan-400">{formatNumber(country.count)}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </BriefPanel>

        <BriefPanel
          eyebrow="Tradecraft"
          title="How operations are showing up"
          description="Attack clusters are stronger than vector coverage right now, so both views are shown together."
        >
          <div className="space-y-4">
            <div className="space-y-2">
              {attackClusters.map((cluster) => (
                <BarRow
                  key={cluster.cluster}
                  label={cluster.cluster}
                  value={`${formatNumber(cluster.count)} · ${formatPercent(cluster.percentage)}`}
                  width={cluster.percentage}
                  tone="amber"
                />
              ))}
            </div>
            <div className="divider pt-4">
              <p className="mb-3 text-sm font-medium text-zinc-300">Named attack vectors</p>
              <div className="flex flex-wrap gap-2">
                {attackVectors.map((vector) => (
                  <span
                    key={vector.vector}
                    className="rounded-full border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-xs text-zinc-300"
                  >
                    {vector.vector} · {formatNumber(vector.count)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </BriefPanel>

        <BriefPanel
          eyebrow="Exposure"
          title="What the dataset can quantify"
          description="Exact record-loss counts are sparse, so this card focuses on known large-impact events rather than pretending full coverage."
        >
          <div className="grid grid-cols-2 gap-3">
            <MiniMetric
              label="Known Record Events"
              value={formatNumber(intel.exposure.known_record_events)}
            />
            <MiniMetric
              label="Known Record Volume"
              value={formatNumber(intel.exposure.known_record_volume)}
            />
          </div>
          <div className="mt-4 space-y-2">
            {largestRecordEvents.length > 0 ? (
              largestRecordEvents.map((event) => (
                <Link
                  key={event.incident_id}
                  href={`/incidents/${event.incident_id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 transition-colors hover:border-cyan-500/30 hover:bg-zinc-800/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-100">{event.display_name}</p>
                    <p className="text-xs text-zinc-500">{formatDate(event.incident_date)} · {event.country || "Unknown country"}</p>
                  </div>
                  <span className="shrink-0 font-mono text-emerald-400">
                    {formatNumber(event.records_affected)}
                  </span>
                </Link>
              ))
            ) : (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-6 text-sm text-zinc-600">
                No exact record-count events are attached to the current public canonical set yet.
              </div>
            )}
          </div>
        </BriefPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <BriefPanel
          eyebrow="Attribution"
          title="Watchlist actors"
          description="Top attributed groups in the current canonical set."
        >
          <div className="space-y-2">
            {topActors.length > 0 ? (
              topActors.map((actor) => (
                <Link
                  key={actor.name}
                  href={`/incidents?search=${encodeURIComponent(actor.name)}`}
                  className="flex items-start justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-3 transition-colors hover:border-cyan-500/30 hover:bg-zinc-800/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-100">{actor.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {actor.countries_targeted.slice(0, 3).join(", ") || "Multi-region"} · last seen {formatDate(actor.last_seen || actor.first_seen)}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-violet-400">{formatNumber(actor.incident_count)}</span>
                </Link>
              ))
            ) : (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-6 text-sm text-zinc-600">
                Actor attribution is still limited across the dataset.
              </div>
            )}
          </div>
        </BriefPanel>

        <div className="xl:col-span-2 min-h-[420px]">
          <RecentIncidentsList incidents={recent_incidents} />
        </div>
      </div>
    </div>
  );
}

function BriefPanel({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-[#0d0d1a] p-5">
      <div className="mb-4">
        <p className="section-label mb-1">{eyebrow}</p>
        <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function BriefStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-3">
      <p className="text-[10px] uppercase tracking-widest text-zinc-600">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold text-zinc-100">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{detail}</p>
    </div>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-3">
      <p className="text-[10px] uppercase tracking-widest text-zinc-600">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

function BarRow({
  label,
  value,
  width,
  tone = "cyan",
}: {
  label: string;
  value: string;
  width: number;
  tone?: "cyan" | "amber" | "emerald" | "violet";
}) {
  const tones = {
    cyan: "from-cyan-500 to-sky-500",
    amber: "from-amber-500 to-orange-500",
    emerald: "from-emerald-500 to-teal-500",
    violet: "from-violet-500 to-fuchsia-500",
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="text-zinc-300">{label}</span>
        <span className="font-mono text-zinc-500">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r", tones[tone])}
          style={{ width: `${Math.min(Math.max(width, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}
