"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getIncidentTrend,
  getIncidents,
  getRansomwareAnalytics,
  getStats,
  type RecentIncident,
} from "@/lib/api";
import { PageHeader, PageSkeleton } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { RansomwareChart } from "@/components/charts/RansomwareChart";
import { IncidentTimeChart } from "@/components/charts/IncidentTimeChart";
import { RecentIncidentsList } from "@/components/RecentIncidentsList";
import { formatDate, formatNumber } from "@/lib/utils";
import { AlertTriangle, Globe2, Lock, Percent, Target } from "lucide-react";

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

export default function RansomwareIntelligencePage() {
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: getStats });
  const { data: families, isLoading: loadingFamilies } = useQuery({
    queryKey: ["ransomware-families-v2"],
    queryFn: () => getRansomwareAnalytics(20),
  });
  const { data: trend, isLoading: loadingTrend } = useQuery({
    queryKey: ["ransomware-trend-v2"],
    queryFn: () => getIncidentTrend({ search: "ransomware", bucket: "month", limit: 24 }),
  });
  const { data: recentIncidentsRaw, isLoading: loadingRecent } = useQuery({
    queryKey: ["ransomware-recent-incidents-v2"],
    queryFn: () => getIncidents({ per_page: 120, sort_by: "incident_date", sort_order: "desc" }),
  });

  if (loadingFamilies || loadingTrend || loadingRecent) {
    return <PageSkeleton rows={4} />;
  }

  const familyItems = families?.data || [];
  const recentRansomware = (recentIncidentsRaw?.incidents || []).filter(
    (incident) => Boolean(incident.ransomware_family),
  );
  const recentIncidents = toRecentIncidents(recentRansomware.slice(0, 12));

  const geoTargets = useMemo(() => {
    const counts = new Map<string, number>();
    for (const incident of recentRansomware) {
      if (!incident.country) continue;
      counts.set(incident.country, (counts.get(incident.country) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [recentRansomware]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={Lock}
        iconColor="text-red-400"
        label="Ransomware Intelligence"
        title="Ransomware Intelligence"
        description={`Family prevalence, recent victimization, and geographic targeting across the canonical education-sector dataset`}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard
          title="Ransomware Incidents"
          value={stats?.incidents_with_ransomware || 0}
          icon={Lock}
          variant="danger"
        />
        <StatCard
          title="Tracked Families"
          value={stats?.unique_ransomware_families || familyItems.length}
          icon={Target}
          variant="purple"
        />
        <StatCard
          title="Recent Ransom Rows"
          value={recentRansomware.length}
          icon={AlertTriangle}
          variant="warning"
        />
        <StatCard
          title="Countries Hit"
          value={geoTargets.length}
          icon={Globe2}
          variant="success"
        />
        <StatCard
          title="Ransomware Share"
          value={
            stats?.education_incidents
              ? `${Math.round((stats.incidents_with_ransomware / stats.education_incidents) * 100)}%`
              : "0%"
          }
          icon={Percent}
          variant="primary"
        />
      </div>

      <IncidentTimeChart data={trend?.items || []} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RansomwareChart data={familyItems} />
        <div className="rounded-xl border border-zinc-800 bg-[#0d0d1a] p-5">
          <div className="mb-4">
            <p className="section-label mb-1">Geographic Targeting</p>
            <h3 className="text-lg font-semibold text-zinc-100">Recent Country Distribution</h3>
          </div>
          <div className="space-y-3">
            {geoTargets.map(([country, count]) => (
              <div key={country}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-zinc-300">{country}</span>
                  <span className="font-mono text-cyan-400">{count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-500 to-violet-500"
                    style={{ width: `${(count / Math.max(geoTargets[0]?.[1] || 1, 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {geoTargets.length === 0 && (
              <div className="flex h-[320px] items-center justify-center text-sm text-zinc-600">
                No country distribution is available yet for ransomware-tagged canonicals.
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
            <p className="section-label mb-1">Family Watchlist</p>
            <h3 className="text-lg font-semibold text-zinc-100">Top Family Snapshot</h3>
          </div>
          <div className="space-y-3">
            {familyItems.slice(0, 8).map((item) => (
              <div key={item.category} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-100">{item.category}</p>
                  <p className="font-mono text-red-400">{formatNumber(item.count)}</p>
                </div>
                <p className="text-xs text-zinc-500">{item.percentage.toFixed(1)}% of ransomware canonicals</p>
              </div>
            ))}
            <p className="pt-1 text-[10px] text-zinc-600">
              Last refreshed from the canonical read path on {formatDate(stats?.last_updated || "")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
