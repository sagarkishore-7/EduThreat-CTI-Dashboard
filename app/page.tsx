"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "@/lib/api";
import { StatCard } from "@/components/StatCard";
import { IncidentTimeChart } from "@/components/charts/IncidentTimeChart";
import { AttackTypeChart } from "@/components/charts/AttackTypeChart";
import { CountryChart } from "@/components/charts/CountryChart";
import { RansomwareChart } from "@/components/charts/RansomwareChart";
import { RecentIncidentsList } from "@/components/RecentIncidentsList";
import {
  FileText,
  Shield,
  Globe2,
  Users,
  AlertTriangle,
  Database,
  Bug,
  Lock,
} from "lucide-react";

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to Load Dashboard</h2>
          <p className="text-muted-foreground">
            Unable to connect to the API. Please check if the server is running.
          </p>
        </div>
      </div>
    );
  }

  const { stats, incidents_by_country, incidents_by_attack_type, incidents_by_ransomware, incidents_over_time, recent_incidents } = data;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Incidents"
          value={stats.total_incidents}
          icon={FileText}
          variant="primary"
        />
        <StatCard
          title="Ransomware Attacks"
          value={stats.incidents_with_ransomware}
          icon={Lock}
          variant="danger"
        />
        <StatCard
          title="Data Breaches"
          value={stats.incidents_with_data_breach}
          icon={Database}
          variant="warning"
        />
        <StatCard
          title="Countries Affected"
          value={stats.countries_affected}
          icon={Globe2}
          variant="success"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Enriched Incidents"
          value={stats.enriched_incidents}
          icon={Shield}
        />
        <StatCard
          title="Pending Analysis"
          value={stats.unenriched_incidents}
          icon={Bug}
        />
        <StatCard
          title="Threat Actors"
          value={stats.unique_threat_actors}
          icon={Users}
        />
        <StatCard
          title="Ransomware Families"
          value={stats.unique_ransomware_families}
          icon={AlertTriangle}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IncidentTimeChart data={incidents_over_time} />
        <AttackTypeChart data={incidents_by_attack_type} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CountryChart data={incidents_by_country} />
        <RansomwareChart data={incidents_by_ransomware} />
        <RecentIncidentsList incidents={recent_incidents} />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl p-5 h-28 skeleton"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl p-5 h-28 skeleton"
          />
        ))}
      </div>
      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl p-5 h-[380px] skeleton"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl p-5 h-[400px] skeleton"
          />
        ))}
      </div>
    </div>
  );
}

