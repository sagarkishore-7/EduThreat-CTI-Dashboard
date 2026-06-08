"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import {
  getAnalyticsBreakdowns,
  getAttackTypeAnalytics,
  getIncidentTrend,
  getIncidents,
  getMitreAnalytics,
  getThreatActors,
  type RecentIncident,
} from "@/lib/api";
import { PageHeader, PageSkeleton } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";

// recharts-backed charts are heavy; defer them so headline metrics paint first.
const chartLoader = () => <div className="h-64 animate-pulse rounded bg-zinc-900/40" />;
const AttackTypeChart = dynamic(() => import("@/components/charts/AttackTypeChart").then((m) => m.AttackTypeChart), { ssr: false, loading: chartLoader });
const IncidentTimeChart = dynamic(() => import("@/components/charts/IncidentTimeChart").then((m) => m.IncidentTimeChart), { ssr: false, loading: chartLoader });
const InstitutionTypeChart = dynamic(() => import("@/components/charts/InstitutionTypeChart").then((m) => m.InstitutionTypeChart), { ssr: false, loading: chartLoader });
const MitreMatrix = dynamic(() => import("@/components/charts/MitreMatrix").then((m) => m.MitreMatrix), { ssr: false, loading: chartLoader });
import { RecentIncidentsList } from "@/components/RecentIncidentsList";
import { formatAttackCategory, formatNumber, formatPercent } from "@/lib/utils";
import { AlertTriangle, Shield, Target, Users, Workflow } from "lucide-react";

function toRecentIncidents(
  incidents: Array<{
    incident_id: string;
    institution_name: string;
    country?: string;
    attack_category?: string;
    ransomware_family?: string;
    incident_date?: string;
    title?: string;
    enriched_summary?: string;
    threat_actor_name?: string;
  }>,
): RecentIncident[] {
  return incidents.map((incident) => ({
    incident_id: incident.incident_id,
    institution_name: incident.institution_name,
    country: incident.country,
    attack_category: incident.attack_category,
    ransomware_family: incident.ransomware_family,
    incident_date: incident.incident_date,
    title: incident.title,
    enriched_summary: incident.enriched_summary,
    threat_actor_name: incident.threat_actor_name,
  }));
}

export default function AttackIntelligencePage() {
  const attackTypesQuery = useQuery({
    queryKey: ["attack-types-v2"],
    queryFn: () => getAttackTypeAnalytics(16),
  });
  const trendQuery = useQuery({
    queryKey: ["attack-trend-v2"],
    queryFn: () => getIncidentTrend({ bucket: "month", limit: 24 }),
  });
  const breakdownsQuery = useQuery({
    queryKey: ["attack-breakdowns-v2"],
    queryFn: () => getAnalyticsBreakdowns(),
  });
  const recentQuery = useQuery({
    queryKey: ["attack-recent-incidents"],
    queryFn: () => getIncidents({ per_page: 10, sort_by: "incident_date", sort_order: "desc" }),
  });
  const actorsQuery = useQuery({
    queryKey: ["attack-threat-actors"],
    queryFn: () => getThreatActors(8),
  });
  const mitreQuery = useQuery({
    queryKey: ["mitre-analytics", 20, 5],
    queryFn: () => getMitreAnalytics({ technique_limit: 20, per_tactic_limit: 5 }),
  });

  if (
    attackTypesQuery.isLoading ||
    trendQuery.isLoading ||
    breakdownsQuery.isLoading ||
    recentQuery.isLoading ||
    actorsQuery.isLoading ||
    mitreQuery.isLoading
  ) {
    return <PageSkeleton rows={4} />;
  }

  if (
    attackTypesQuery.error ||
    trendQuery.error ||
    breakdownsQuery.error ||
    recentQuery.error ||
    actorsQuery.error ||
    mitreQuery.error
  ) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <div className="ops-panel px-6 py-8 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Tradecraft view unavailable</h2>
          <p className="mt-2 text-sm text-zinc-500">One or more analytics endpoints did not respond successfully.</p>
        </div>
      </div>
    );
  }

  const attackItems = attackTypesQuery.data?.data || [];
  const trend = trendQuery.data?.items || [];
  const breakdowns = breakdownsQuery.data;
  const actors = actorsQuery.data?.threat_actors || [];
  const mitre = mitreQuery.data!;
  const recentIncidents = toRecentIncidents(recentQuery.data?.incidents || []);
  const institutionTypes = breakdowns?.institution_types || [];
  const severityItems = breakdowns?.severities || [];
  const topAttack = attackItems[0];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={Workflow}
        iconColor="text-amber-300"
        label="Tradecraft"
        title="Tradecraft & Intrusion Patterns"
        description="Attack delivery, victim targeting, severity distribution, and observed ATT&CK stage frequency across the retained canonical set."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <HeaderMetric
            label="Observed Tactics"
            value={formatNumber(mitre.overview.unique_tactic_count)}
            detail={`${formatNumber(mitre.overview.incidents_with_mitre)} incidents with ATT&CK coverage`}
          />
          <HeaderMetric
            label="Techniques"
            value={formatNumber(mitre.overview.unique_technique_count)}
            detail={`${formatNumber(mitre.overview.technique_count_total)} technique observations`}
          />
          <HeaderMetric
            label="Lead Attack Cluster"
            value={topAttack ? formatAttackCategory(topAttack.category) : "n/a"}
            detail={`${topAttack ? formatNumber(topAttack.count) : "0"} mapped canonicals`}
          />
          <HeaderMetric
            label="Institution Types"
            value={formatNumber(institutionTypes.length)}
            detail="Distinct victim segment buckets in the filtered corpus"
          />
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          title="Mapped MITRE Share"
          value={formatPercent(mitre.overview.incidents_with_mitre_share)}
          description="Open canonicals with ATT&CK techniques retained in the merged projection."
          icon={Shield}
          variant="primary"
        />
        <StatCard
          title="Top Cluster"
          value={topAttack ? formatAttackCategory(topAttack.category) : "n/a"}
          description="Most frequent attack category in the current open set."
          icon={AlertTriangle}
          variant="warning"
        />
        <StatCard
          title="Actor Watchlist"
          value={formatNumber(actors.length)}
          description="Named actors visible in the current tradecraft slice."
          icon={Users}
          variant="purple"
        />
        <StatCard
          title="Stage Diversity"
          value={formatNumber(mitre.tactics.length)}
          description="ATT&CK tactic buckets present across retained incidents."
          icon={Target}
          variant="success"
        />
      </div>

      <IncidentTimeChart data={trend} />

      {/* MITRE ATT&CK matrix — tactics in kill-chain order, top techniques as
          frequency-coloured cells. Scrolls horizontally on small screens. */}
      <div className="ops-panel">
        <div className="ops-panel-head">
          <div>
            <p className="ops-subtle">MITRE ATT&CK Matrix</p>
            <h2 className="ops-title">Observed techniques by tactic · cell intensity = incident frequency</h2>
          </div>
        </div>
        <div className="ops-panel-body">
          <MitreMatrix data={mitre} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <AttackTypeChart data={attackItems} />
        <div className="ops-panel">
          <div className="ops-panel-head">
            <div>
              <p className="ops-subtle">MITRE Stage Frequency</p>
              <h2 className="ops-title">Observed tactic distribution</h2>
            </div>
          </div>
          <div className="ops-panel-body space-y-3">
            {mitre.tactics.length > 0 ? (
              mitre.tactics.slice(0, 8).map((tactic) => (
                <div key={tactic.tactic}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="text-sm text-zinc-200">{tactic.tactic}</span>
                    <span className="font-mono text-indigo-300">
                      {formatNumber(tactic.incident_count)} · {formatPercent(tactic.incident_percentage)}
                    </span>
                  </div>
                  <div className="ops-bar-track">
                    <div className="ops-bar-fill" style={{ width: `${Math.min(tactic.incident_percentage, 100)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{formatNumber(tactic.technique_count)} mapped techniques</p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 px-3 py-5 text-sm text-zinc-500">
                MITRE stage observations are not available yet in the current canonical set.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <InstitutionTypeChart data={institutionTypes} />
        <div className="ops-panel">
          <div className="ops-panel-head">
            <div>
              <p className="ops-subtle">Severity Profile</p>
              <h2 className="ops-title">Operational risk concentration</h2>
            </div>
          </div>
          <div className="ops-panel-body space-y-3">
            {severityItems.length > 0 ? (
              severityItems.map((item) => (
                <div key={item.category} className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-zinc-200">{formatAttackCategory(item.category)}</span>
                    <span className="font-mono text-emerald-300">{formatNumber(item.count)}</span>
                  </div>
                  <div className="ops-bar-track">
                    <div className="ops-bar-fill" style={{ width: `${Math.min(item.percentage, 100)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{formatPercent(item.percentage)} of canonicals</p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 px-3 py-5 text-sm text-zinc-500">
                Severity metadata is still sparse in the current dataset.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <RecentIncidentsList incidents={recentIncidents} />
        <div className="ops-panel">
          <div className="ops-panel-head">
            <div>
              <p className="ops-subtle">Technique Watchlist</p>
              <h2 className="ops-title">Top ATT&CK techniques</h2>
            </div>
          </div>
          <div className="ops-panel-body space-y-2">
            {mitre.techniques.slice(0, 8).map((technique) => (
              <div key={`${technique.tactic}-${technique.technique_id}`} className="ops-live-row">
                <div className="mt-1 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(0,216,180,0.7)]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-100">
                        {technique.technique_id} · {technique.technique_name}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">{technique.tactic}</p>
                    </div>
                    <span className="font-mono text-emerald-300">{formatNumber(technique.count)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeaderMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-2 font-mono text-2xl text-zinc-100">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{detail}</p>
    </div>
  );
}
