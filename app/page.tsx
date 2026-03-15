"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "@/lib/api";
import { StatCard } from "@/components/StatCard";
import { RecentIncidentsList } from "@/components/RecentIncidentsList";
import { formatCurrency } from "@/lib/utils";

const IncidentTimeChart = dynamic(
  () => import("@/components/charts/IncidentTimeChart").then((m) => m.IncidentTimeChart),
  { ssr: false }
);
const AttackTypeChart = dynamic(
  () => import("@/components/charts/AttackTypeChart").then((m) => m.AttackTypeChart),
  { ssr: false }
);
const WorldHeatmap = dynamic(
  () => import("@/components/charts/WorldHeatmap").then((m) => m.WorldHeatmap),
  { ssr: false }
);
const RansomwareChart = dynamic(
  () => import("@/components/charts/RansomwareChart").then((m) => m.RansomwareChart),
  { ssr: false }
);
import {
  GraduationCap,
  Globe2,
  Users,
  AlertTriangle,
  Database,
  Lock,
  Clock,
  DollarSign,
  Target,
  Layers,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    refetchInterval: 60000,
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
      {/* Primary Stats - Core Research Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Education Institutions Affected"
          value={stats.education_incidents}
          description="Confirmed education-sector cyber incidents"
          icon={GraduationCap}
          variant="primary"
          href="/incidents?enriched_only=true"
        />
        <StatCard
          title="Ransomware Attacks"
          value={stats.incidents_with_ransomware}
          description={`${stats.unique_ransomware_families} unique ransomware families`}
          icon={Lock}
          variant="danger"
          href="/incidents?attack_category=ransomware"
        />
        <StatCard
          title="Data Breaches"
          value={stats.incidents_with_data_breach}
          description="Incidents with confirmed data exfiltration"
          icon={Database}
          variant="warning"
          href="/incidents?attack_category=data_breach"
        />
        <StatCard
          title="Countries Affected"
          value={stats.countries_affected}
          description="Nations with education-sector incidents"
          icon={Globe2}
          variant="success"
          href="/map"
        />
      </div>

      {/* Secondary Research Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Threat Actors"
          value={stats.unique_threat_actors}
          description="Identified threat groups"
          icon={Users}
          variant="danger"
          href="/incidents"
        />
        <StatCard
          title="MITRE ATT&CK Mapped"
          value={stats.incidents_with_mitre}
          description="With technique attribution"
          icon={Target}
          variant="purple"
        />
        <StatCard
          title="Avg Recovery Time"
          value={stats.avg_recovery_days ? `${stats.avg_recovery_days} days` : "N/A"}
          description="Mean time to recover"
          icon={Clock}
          variant="warning"
        />
        {stats.total_financial_impact > 0 && (
          <StatCard
            title="Financial Impact"
            value={formatCurrency(stats.total_financial_impact)}
            description="Estimated total recovery costs"
            icon={DollarSign}
            variant="pink"
          />
        )}
        <StatCard
          title="Intelligence Sources"
          value={stats.data_sources}
          description="Active data feeds"
          icon={Layers}
          variant="success"
        />
      </div>

      {/* World Heatmap - Full Width */}
      <WorldHeatmap
        data={incidents_by_country}
        onCountryClick={(country) => {
          router.push(`/incidents?country=${encodeURIComponent(country)}`);
        }}
      />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IncidentTimeChart data={incidents_over_time} />
        <AttackTypeChart data={incidents_by_attack_type} />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RansomwareChart data={incidents_by_ransomware} />
        <RecentIncidentsList incidents={recent_incidents} />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 h-28 skeleton" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 h-24 skeleton" />
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl p-5 h-[460px] skeleton" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 h-[380px] skeleton" />
        ))}
      </div>
    </div>
  );
}
