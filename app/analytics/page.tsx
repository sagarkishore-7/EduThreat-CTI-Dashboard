"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAnalyticsBreakdowns,
  getCountryAnalytics,
  getDashboard,
  getTimelineAnalytics,
} from "@/lib/api";
import { PageHeader, PageSkeleton } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { AttackTypeChart } from "@/components/charts/AttackTypeChart";
import { CountryChart } from "@/components/charts/CountryChart";
import { IncidentTimeChart } from "@/components/charts/IncidentTimeChart";
import { InstitutionTypeChart } from "@/components/charts/InstitutionTypeChart";
import { formatAttackCategory, formatNumber } from "@/lib/utils";
import {
  BarChart3,
  Building2,
  Database,
  Globe2,
  Layers,
  Shield,
} from "lucide-react";

export default function ImpactAnalyticsPage() {
  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
  });
  const { data: countries, isLoading: loadingCountries } = useQuery({
    queryKey: ["analytics-countries-v2"],
    queryFn: () => getCountryAnalytics(20),
  });
  const { data: timeline, isLoading: loadingTimeline } = useQuery({
    queryKey: ["analytics-timeline-v2"],
    queryFn: () => getTimelineAnalytics(36),
  });
  const { data: breakdowns, isLoading: loadingBreakdowns } = useQuery({
    queryKey: ["analytics-breakdowns-v2"],
    queryFn: () => getAnalyticsBreakdowns(),
  });

  if (loadingCountries || loadingTimeline || loadingBreakdowns) {
    return <PageSkeleton rows={4} />;
  }

  const stats = dashboard?.stats;
  const countryData = countries?.data || [];
  const attackTypes = breakdowns?.attack_categories || [];
  const institutionTypes = breakdowns?.institution_types || [];
  const severities = breakdowns?.severities || [];
  const ransomware = dashboard?.incidents_by_ransomware || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={BarChart3}
        label="Impact Analytics"
        title="Canonical Impact Analytics"
        description={`Sector-level trends and distribution views built entirely from the v2 canonical Postgres model`}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard
          title="Canonicals"
          value={stats?.education_incidents || 0}
          icon={Shield}
          variant="primary"
        />
        <StatCard
          title="Countries"
          value={stats?.countries_affected || 0}
          icon={Globe2}
          variant="success"
        />
        <StatCard
          title="Attack Types"
          value={attackTypes.length}
          icon={Layers}
          variant="danger"
        />
        <StatCard
          title="Institution Types"
          value={institutionTypes.length}
          icon={Building2}
          variant="purple"
        />
        <StatCard
          title="Breach-Tagged"
          value={stats?.incidents_with_data_breach || 0}
          icon={Database}
          variant="warning"
        />
      </div>

      <IncidentTimeChart data={timeline?.data || []} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CountryChart data={countryData} />
        <AttackTypeChart data={attackTypes} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <InstitutionTypeChart data={institutionTypes} />
        <div className="rounded-xl border border-zinc-800 bg-[#0d0d1a] p-5">
          <div className="mb-4">
            <p className="section-label mb-1">Severity & Ransomware</p>
            <h3 className="text-lg font-semibold text-zinc-100">Dataset Composition</h3>
          </div>

          <div className="space-y-5">
            <div>
              <p className="mb-3 text-sm font-medium text-zinc-300">Severity</p>
              <div className="space-y-2">
                {severities.map((item) => (
                  <div key={item.category}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-zinc-400">{formatAttackCategory(item.category)}</span>
                      <span className="font-mono text-zinc-200">{formatNumber(item.count)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500"
                        style={{ width: `${Math.min(item.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4">
              <p className="mb-3 text-sm font-medium text-zinc-300">Top Ransomware Families</p>
              <div className="space-y-2">
                {ransomware.slice(0, 6).map((item) => (
                  <div
                    key={item.category}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2"
                  >
                    <span className="text-sm text-zinc-200">{item.category}</span>
                    <span className="font-mono text-cyan-400">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
