"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getCountryAnalytics,
  getAttackTypeAnalytics,
  getRansomwareAnalytics,
  getTimelineAnalytics,
  getStats,
} from "@/lib/api";
import { StatCard } from "@/components/StatCard";
import { IncidentTimeChart } from "@/components/charts/IncidentTimeChart";
import { AttackTypeChart } from "@/components/charts/AttackTypeChart";
import { CountryChart } from "@/components/charts/CountryChart";
import { RansomwareChart } from "@/components/charts/RansomwareChart";
import { formatNumber, getCountryFlag, cn } from "@/lib/utils";
import {
  BarChart3,
  Globe2,
  Shield,
  Lock,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

export default function AnalyticsPage() {
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
  });

  const { data: countryData, isLoading: countryLoading } = useQuery({
    queryKey: ["analytics-countries"],
    queryFn: () => getCountryAnalytics(20),
  });

  const { data: attackData, isLoading: attackLoading } = useQuery({
    queryKey: ["analytics-attacks"],
    queryFn: () => getAttackTypeAnalytics(15),
  });

  const { data: ransomwareData, isLoading: ransomwareLoading } = useQuery({
    queryKey: ["analytics-ransomware"],
    queryFn: () => getRansomwareAnalytics(15),
  });

  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ["analytics-timeline"],
    queryFn: () => getTimelineAnalytics(36),
  });

  const isLoading = countryLoading || attackLoading || ransomwareLoading || timelineLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 skeleton rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[380px] skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">Analytics Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          Comprehensive analysis of cyber threats affecting the education sector
        </p>
      </div>

      {/* Key Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Analyzed"
            value={stats.total_incidents}
            icon={TrendingUp}
            variant="primary"
          />
          <StatCard
            title="Ransomware Rate"
            value={`${((stats.incidents_with_ransomware / stats.total_incidents) * 100).toFixed(1)}%`}
            icon={Lock}
            variant="danger"
          />
          <StatCard
            title="Data Breach Rate"
            value={`${((stats.incidents_with_data_breach / stats.total_incidents) * 100).toFixed(1)}%`}
            icon={Shield}
            variant="warning"
          />
          <StatCard
            title="Enrichment Coverage"
            value={`${((stats.enriched_incidents / stats.total_incidents) * 100).toFixed(1)}%`}
            icon={AlertTriangle}
            variant="success"
          />
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline Chart */}
        {timelineData && <IncidentTimeChart data={timelineData.data} />}

        {/* Attack Types */}
        {attackData && <AttackTypeChart data={attackData.data} />}

        {/* Countries */}
        {countryData && <CountryChart data={countryData.data} />}

        {/* Ransomware */}
        {ransomwareData && <RansomwareChart data={ransomwareData.data} />}
      </div>

      {/* Detailed Country Table */}
      {countryData && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-primary" />
            Incidents by Country
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {countryData.data.map((item, index) => (
              <div
                key={item.category}
                className={cn(
                  "p-4 bg-secondary/50 rounded-lg border border-border",
                  "animate-slide-up"
                )}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getCountryFlag(item.category)}</span>
                  <span className="font-medium">{item.category}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{formatNumber(item.count)}</span>
                  <span className="text-sm text-muted-foreground">
                    ({item.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

