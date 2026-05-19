"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, PageSkeleton } from "@/components/PageHeader";
import { RecentIncidentsList } from "@/components/RecentIncidentsList";
import { StatCard } from "@/components/StatCard";
import {
  getDashboard,
  getMitreAnalytics,
  getPipelineResearchMetrics,
} from "@/lib/api";
import { formatDate, formatNumber, formatPercent, getCountryFlag } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  Database,
  Link2,
  Lock,
  Radar,
  Shield,
  Target,
  Users,
} from "lucide-react";

const IncidentTimeChart = dynamic(
  () => import("@/components/charts/IncidentTimeChart").then((m) => m.IncidentTimeChart),
  { ssr: false },
);

const WorldHeatmap = dynamic(
  () => import("@/components/charts/WorldHeatmap").then((m) => m.WorldHeatmap),
  { ssr: false },
);

export default function DashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    refetchInterval: 60_000,
  });
  const researchQuery = useQuery({
    queryKey: ["pipeline-research"],
    queryFn: getPipelineResearchMetrics,
    refetchInterval: 60_000,
  });
  const mitreQuery = useQuery({
    queryKey: ["mitre-analytics", 12, 4],
    queryFn: () => getMitreAnalytics({ technique_limit: 12, per_tactic_limit: 4 }),
    refetchInterval: 60_000,
  });

  if (dashboardQuery.isLoading || researchQuery.isLoading || mitreQuery.isLoading) {
    return <PageSkeleton rows={4} />;
  }

  if (dashboardQuery.error || researchQuery.error || mitreQuery.error || !dashboardQuery.data || !researchQuery.data || !mitreQuery.data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="ops-panel max-w-lg px-6 py-8 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <h2 className="mb-2 text-lg font-semibold text-zinc-100">Unable to load the CTI briefing</h2>
          <p className="text-sm text-zinc-500">
            The dashboard could not reach one of the v2 analytics endpoints. Try refreshing once the API is reachable again.
          </p>
        </div>
      </div>
    );
  }

  const data = dashboardQuery.data;
  const research = researchQuery.data;
  const mitre = mitreQuery.data;
  const stats = data.stats;
  const intel = data.intelligence_summary;
  const queuedBacklog = research.pipeline_performance.queue_backlog_current
    .filter((row) => row.status === "queued")
    .reduce((sum, row) => sum + row.task_count, 0);
  const findings = intel.priority_findings.slice(0, 4);
  const topCountries = intel.victimology.top_countries.slice(0, 6);
  const topActors = intel.attribution.top_threat_actors.slice(0, 6);
  const attackClusters = intel.tradecraft.attack_clusters.slice(0, 5);
  const attackVectors = intel.tradecraft.attack_vectors.slice(0, 6);
  const recordEvents = intel.exposure.largest_record_events.slice(0, 5);
  const tacticStrip = mitre.tactics.slice(0, 6);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={Radar}
        iconColor="text-emerald-300"
        label="Executive Briefing"
        title="Education-Sector Threat Operations Picture"
        description={`Live operator view of the retained canonical incident set, refreshed ${formatDate(stats.last_updated)} and anchored on the v2 Postgres CTI pipeline.`}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <OpsStripItem
            label="Collection"
            value={formatNumber(research.dataset_construction.source_incidents_total)}
            detail="Source incidents retained in the current build"
          />
          <OpsStripItem
            label="Fetch Success"
            value={formatPercent(research.fetch_performance.overall.success_rate_pct)}
            detail={`${formatNumber(research.fetch_performance.overall.selected_successes_total)} selected article fetches`}
          />
          <OpsStripItem
            label="Queue Backlog"
            value={formatNumber(queuedBacklog)}
            detail={`${research.pipeline_performance.expired_leases_current} expired leases live`}
            tone={queuedBacklog > 500 ? "danger" : "default"}
          />
          <OpsStripItem
            label="MITRE Coverage"
            value={formatPercent(mitre.overview.incidents_with_mitre_share)}
            detail={`${formatNumber(mitre.overview.unique_tactic_count)} observed tactics in the open set`}
            tone="pulse"
          />
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          title="Open Canonicals"
          value={stats.education_incidents}
          description="Incident-centric cases retained in the public education-sector set."
          icon={Shield}
          variant="primary"
          href="/incidents"
        />
        <StatCard
          title="Ransomware Pressure"
          value={formatPercent(intel.overview.ransomware_share)}
          description={`${formatNumber(intel.overview.ransomware_count)} canonicals with extortion or encryption pressure.`}
          icon={Lock}
          variant="danger"
          href="/ransomware"
        />
        <StatCard
          title="Named Actors"
          value={formatPercent(intel.overview.actor_attributed_share)}
          description={`${formatNumber(intel.overview.actor_attributed_count)} incidents with actor attribution.`}
          icon={Users}
          variant="purple"
          href="/threat-actors"
        />
        <StatCard
          title="Known Record Events"
          value={formatNumber(intel.exposure.known_record_events)}
          description={`${formatNumber(intel.exposure.known_record_volume)} exact known records across quantified breaches.`}
          icon={Database}
          variant="warning"
          href="/analytics"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="ops-panel overflow-hidden">
          <div className="ops-panel-head">
            <div>
              <p className="ops-subtle">Geographic Pressure</p>
              <h2 className="ops-title">Where the retained activity concentrates</h2>
            </div>
            <Link href="/map" className="ops-chip ops-chip-brand">
              Open map
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="ops-panel-body">
            <WorldHeatmap data={data.incidents_by_country} onCountryClick={(country) => {
              window.location.href = `/incidents?country=${encodeURIComponent(country)}`;
            }} />
          </div>
        </div>

        <RecentIncidentsList incidents={data.recent_incidents} />
      </div>

      <div className="ops-panel">
        <div className="ops-panel-head">
          <div>
            <p className="ops-subtle">MITRE ATT&CK</p>
            <h2 className="ops-title">Observed tactics in the open canonical set</h2>
          </div>
          <div className="ops-chip ops-chip-pulse">
            {formatNumber(mitre.overview.technique_count_total)} technique observations
          </div>
        </div>
        <div className="ops-panel-body">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            {tacticStrip.map((tactic) => (
              <div key={tactic.tactic} className="rounded-xl border border-zinc-800/70 bg-zinc-900/35 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{tactic.tactic}</p>
                <p className="mt-2 font-mono text-2xl text-zinc-100">{formatNumber(tactic.incident_count)}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatPercent(tactic.incident_percentage)} of open canonicals · {formatNumber(tactic.technique_count)} mapped techniques
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <IncidentTimeChart data={data.incidents_over_time} />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr_0.95fr]">
        <BriefPanel
          eyebrow="Priority Findings"
          title="Immediate briefing pivots"
          description="High-signal themes already derived from the retained education-sector dataset."
        >
          <div className="grid gap-3 md:grid-cols-2">
            {findings.map((finding) => (
              <div key={finding.title} className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{finding.title}</p>
                <p className="mt-2 text-lg font-semibold text-zinc-100">{finding.value}</p>
                <p className="mt-2 text-sm text-zinc-500">{finding.context}</p>
              </div>
            ))}
          </div>
        </BriefPanel>

        <BriefPanel
          eyebrow="Attribution"
          title="Top threat actors"
          description="Named actors most visible in the current open corpus."
        >
          <div className="space-y-2">
            {topActors.map((actor) => (
              <Link
                key={actor.name}
                href={`/incidents?search=${encodeURIComponent(actor.name)}`}
                className="ops-live-row"
              >
                <div className="mt-1 h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-100">{actor.name}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {actor.countries_targeted.slice(0, 3).join(", ") || "Multi-region"}
                      </p>
                    </div>
                    <span className="font-mono text-indigo-300">{formatNumber(actor.incident_count)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </BriefPanel>

        <BriefPanel
          eyebrow="Tradecraft & Exposure"
          title="What is showing up operationally"
          description="Cluster frequency, vector coverage, and recent quantified exposure events."
        >
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Attack Clusters</p>
              <div className="space-y-2">
                {attackClusters.map((cluster) => (
                  <BarMetric
                    key={cluster.cluster}
                    label={cluster.cluster}
                    value={`${formatNumber(cluster.count)} · ${formatPercent(cluster.percentage)}`}
                    percent={cluster.percentage}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Named Vectors</p>
              <div className="flex flex-wrap gap-2">
                {attackVectors.map((vector) => (
                  <span key={vector.vector} className="ops-chip">
                    {vector.vector}
                    <span className="text-zinc-500">{formatNumber(vector.count)}</span>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Largest record events</p>
              <div className="space-y-2">
                {recordEvents.length > 0 ? recordEvents.map((event) => (
                  <Link
                    key={event.incident_id}
                    href={`/incidents/${event.incident_id}`}
                    className="ops-live-row"
                  >
                    <div className="mt-1 h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(255,140,66,0.8)]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-100">{event.display_name}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {getCountryFlag(event.country_code || event.country || "")} {event.country || "Unknown"} · {formatDate(event.incident_date)}
                          </p>
                        </div>
                        <span className="font-mono text-amber-300">{formatNumber(event.records_affected)}</span>
                      </div>
                    </div>
                  </Link>
                )) : (
                  <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 px-3 py-5 text-sm text-zinc-500">
                    Exact record-loss counts are still sparse in the current public corpus.
                  </div>
                )}
              </div>
            </div>
          </div>
        </BriefPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <BriefPanel
          eyebrow="Victimology"
          title="Countries under the most pressure"
          description="The most visible education-sector victim geographies in the open set."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {topCountries.map((country) => (
              <Link
                key={`${country.category}-${country.country_code}`}
                href={`/incidents?country=${encodeURIComponent(country.category)}`}
                className="ops-live-row"
              >
                <div className="text-lg">{getCountryFlag(country.country_code || country.category, country.flag_emoji)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-zinc-200">{country.category}</span>
                    <span className="font-mono text-emerald-300">{formatNumber(country.count)}</span>
                  </div>
                  <div className="mt-2 ops-bar-track">
                    <div className="ops-bar-fill" style={{ width: `${Math.min(country.percentage, 100)}%` }} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </BriefPanel>

        <BriefPanel
          eyebrow="Pipeline Quality"
          title="How the current dataset is shaping up"
          description="Collection yield, deduplication behavior, and whether the live pipeline is extracting enough signal."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <QualityCard
              title="Source → Selected"
              value={formatPercent(research.dataset_construction.source_to_selected_article_pct)}
              detail={`${formatNumber(research.dataset_construction.selected_article_sources_total)} of ${formatNumber(research.dataset_construction.source_incidents_total)} source incidents`}
            />
            <QualityCard
              title="Source → Canonical"
              value={formatPercent(research.dataset_construction.source_to_canonical_pct)}
              detail={`${formatNumber(research.dataset_construction.canonicalized_sources_total)} canonicalized source enrichments`}
            />
            <QualityCard
              title="Dedup Reduction"
              value={formatPercent(research.dataset_construction.deduplication_reduction_pct)}
              detail={`${formatNumber(research.dataset_construction.duplicate_sources_collapsed)} duplicate sources collapsed`}
            />
            <QualityCard
              title="Richest Selected Tier"
              value={research.fetch_performance.richness_comparison?.richest_selected_tier || "n/a"}
              detail="Current selected-content leader by average extracted length"
            />
          </div>
        </BriefPanel>
      </div>
    </div>
  );
}

function OpsStripItem({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "danger" | "pulse";
}) {
  return (
    <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
        <span
          className={
            tone === "danger"
              ? "ops-chip ops-chip-danger"
              : tone === "pulse"
              ? "ops-chip ops-chip-pulse"
              : "ops-chip ops-chip-brand"
          }
        >
          live
        </span>
      </div>
      <p className="mt-2 font-mono text-2xl text-zinc-100">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{detail}</p>
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
    <div className="ops-panel">
      <div className="ops-panel-head">
        <div>
          <p className="ops-subtle">{eyebrow}</p>
          <h2 className="ops-title">{title}</h2>
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        </div>
      </div>
      <div className="ops-panel-body">{children}</div>
    </div>
  );
}

function BarMetric({
  label,
  value,
  percent,
}: {
  label: string;
  value: string;
  percent: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-sm text-zinc-200">{label}</span>
        <span className="text-xs font-mono text-zinc-400">{value}</span>
      </div>
      <div className="ops-bar-track">
        <div className="ops-bar-fill" style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
}

function QualityCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 p-4">
      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{title}</p>
      <p className="mt-2 font-mono text-xl text-zinc-100">{value}</p>
      <p className="mt-2 text-xs text-zinc-500">{detail}</p>
    </div>
  );
}
