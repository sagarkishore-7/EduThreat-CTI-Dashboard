"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAnalyticsBreakdowns,
  getAttackTypeAnalytics,
  getIncidentTrend,
  getIncidents,
  getStats,
  getThreatActors,
  type RecentIncident,
} from "@/lib/api";
import { PageHeader, PageSkeleton } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { AttackTypeChart } from "@/components/charts/AttackTypeChart";
import { CountryChart } from "@/components/charts/CountryChart";
import { IncidentTimeChart } from "@/components/charts/IncidentTimeChart";
import { InstitutionTypeChart } from "@/components/charts/InstitutionTypeChart";
import { RecentIncidentsList } from "@/components/RecentIncidentsList";
import { formatAttackCategory, formatDate } from "@/lib/utils";
import {
  AlertTriangle,
  Building2,
  Globe2,
  Shield,
  Target,
  Users,
} from "lucide-react";

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
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: getStats });
  const { data: attackTypes, isLoading: loadingAttackTypes } = useQuery({
    queryKey: ["attack-types-v2"],
    queryFn: () => getAttackTypeAnalytics(20),
  });
  const { data: trend, isLoading: loadingTrend } = useQuery({
    queryKey: ["attack-trend-v2"],
    queryFn: () => getIncidentTrend({ bucket: "month", limit: 24 }),
  });
  const { data: breakdowns, isLoading: loadingBreakdowns } = useQuery({
    queryKey: ["attack-breakdowns-v2"],
    queryFn: () => getAnalyticsBreakdowns(),
  });
  const { data: recentList, isLoading: loadingRecent } = useQuery({
    queryKey: ["attack-recent-incidents"],
    queryFn: () => getIncidents({ per_page: 10, sort_by: "incident_date", sort_order: "desc" }),
  });
  const { data: actors, isLoading: loadingActors } = useQuery({
    queryKey: ["attack-threat-actors"],
    queryFn: () => getThreatActors(8),
  });

  const isLoading =
    loadingAttackTypes || loadingTrend || loadingBreakdowns || loadingRecent || loadingActors;

  if (isLoading) return <PageSkeleton rows={4} />;

  const totalIncidents = stats?.education_incidents || 0;
  const attackItems = attackTypes?.data || [];
  const leadAttack = attackItems[0];
  const countryItems = breakdowns?.countries || [];
  const institutionTypes = breakdowns?.institution_types || [];
  const severityItems = breakdowns?.severities || [];
  const actorItems = actors?.threat_actors || [];
  const recentIncidents = toRecentIncidents(recentList?.incidents || []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={Shield}
        label="Attack Intelligence"
        title="Attack Intelligence"
        description={`Core attack distribution, sector trend, and institution targeting across ${totalIncidents} canonical education incidents`}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard title="Verified Incidents" value={totalIncidents} icon={Shield} variant="primary" />
        <StatCard
          title="Attack Types"
          value={attackItems.length}
          icon={AlertTriangle}
          variant="danger"
        />
        <StatCard
          title="Top Category"
          value={leadAttack ? formatAttackCategory(leadAttack.category) : "N/A"}
          icon={Target}
          variant="warning"
        />
        <StatCard
          title="Countries"
          value={countryItems.length}
          icon={Globe2}
          variant="success"
        />
        <StatCard
          title="Institution Types"
          value={institutionTypes.length}
          icon={Building2}
          variant="purple"
        />
      </div>

      <IncidentTimeChart data={trend?.items || []} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AttackTypeChart data={attackItems} />
        <CountryChart data={countryItems} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <InstitutionTypeChart data={institutionTypes} />
        <div className="rounded-xl border border-zinc-800 bg-[#0d0d1a] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="section-label mb-1">Severity Breakdown</p>
              <h3 className="text-lg font-semibold text-zinc-100">Operational Risk Signals</h3>
            </div>
            <Users className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="space-y-3">
            {severityItems.length > 0 ? (
              severityItems.map((item) => (
                <div key={item.category} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-zinc-100">
                      {formatAttackCategory(item.category)}
                    </p>
                    <p className="font-mono text-cyan-400">{item.count}</p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">{item.percentage.toFixed(1)}% of canonicals</p>
                </div>
              ))
            ) : (
              <div className="flex h-[320px] items-center justify-center text-sm text-zinc-600">
                Severity metadata is still building in the v2 dataset.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RecentIncidentsList incidents={recentIncidents} />
        </div>
        <div className="rounded-xl border border-zinc-800 bg-[#0d0d1a] p-5">
          <div className="mb-4">
            <p className="section-label mb-1">Threat Actors</p>
            <h3 className="text-lg font-semibold text-zinc-100">Who Shows Up Most Often</h3>
          </div>
          <div className="space-y-3">
            {actorItems.map((actor) => (
              <div key={actor.name} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-100">{actor.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {actor.countries_targeted.slice(0, 3).join(", ") || "Multi-region"}
                    </p>
                  </div>
                  <p className="shrink-0 font-mono text-lg text-cyan-400">{actor.incident_count}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {actor.ransomware_families.slice(0, 4).map((family) => (
                    <span
                      key={family}
                      className="rounded-full border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400"
                    >
                      {family}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-zinc-600">
                  Last seen {formatDate(actor.last_seen || actor.first_seen || "")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
