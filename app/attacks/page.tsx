"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getStats,
  getAttackTypeAnalytics,
  getAttackTrends,
  getAttackVectors,
  getMitreTactics,
  getInitialAccess,
  getSystemImpact,
  getAttackVectorByInstitution,
  getBreachSeverityTimeline,
  getAttackFlow,
  getMitreSunburst,
} from "@/lib/api";
import { StatCard } from "@/components/StatCard";
import { AttackTrendChart } from "@/components/charts/AttackTrendChart";
import { AttackTypeChart } from "@/components/charts/AttackTypeChart";
import { AttackVectorDonut } from "@/components/charts/AttackVectorDonut";
import { MitreHeatmap } from "@/components/charts/MitreHeatmap";
import { InitialAccessTreemap } from "@/components/charts/InitialAccessTreemap";
import { SystemImpactChart } from "@/components/charts/SystemImpactChart";
import { AttackVectorByInstitution } from "@/components/charts/AttackVectorByInstitution";
import { BreachSeverityTimeline } from "@/components/charts/BreachSeverityTimeline";
import { AttackFlowSankey } from "@/components/charts/AttackFlowSankey";
import { MitreSunburst } from "@/components/charts/MitreSunburst";
import {
  Shield,
  Lock,
  Target,
  Database,
  Crosshair,
} from "lucide-react";

export default function AttackIntelligencePage() {
  // Fetch all data with react-query
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: getStats });
  const { data: attackTypes, isLoading: l1 } = useQuery({ queryKey: ["attack-types-full"], queryFn: () => getAttackTypeAnalytics(20) });
  const { data: attackTrends, isLoading: l2 } = useQuery({ queryKey: ["attack-trends"], queryFn: () => getAttackTrends(36) });
  const { data: attackVectors, isLoading: l3 } = useQuery({ queryKey: ["attack-vectors"], queryFn: () => getAttackVectors(10) });
  const { data: mitreTactics, isLoading: l4 } = useQuery({ queryKey: ["mitre-tactics"], queryFn: getMitreTactics });
  const { data: initialAccess, isLoading: l5 } = useQuery({ queryKey: ["initial-access"], queryFn: () => getInitialAccess(12) });
  const { data: systemImpact, isLoading: l6 } = useQuery({ queryKey: ["system-impact"], queryFn: getSystemImpact });
  const { data: attackVectorByInst, isLoading: l7 } = useQuery({ queryKey: ["attack-vector-by-institution"], queryFn: () => getAttackVectorByInstitution(8) });
  const { data: breachSeverity, isLoading: l8 } = useQuery({ queryKey: ["breach-severity-timeline"], queryFn: () => getBreachSeverityTimeline(60) });
  const { data: attackFlow, isLoading: l9 } = useQuery({ queryKey: ["attack-flow"], queryFn: getAttackFlow });
  const { data: mitreSunburst, isLoading: l10 } = useQuery({ queryKey: ["mitre-sunburst"], queryFn: getMitreSunburst });

  const isLoading = l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8 || l9 || l10;

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-28 skeleton rounded-xl" />)}
        </div>
        {[...Array(3)].map((_, i) => <div key={i} className="h-[380px] skeleton rounded-xl" />)}
      </div>
    );
  }

  // Calculate stat values from stats
  const eduIncidents = stats?.education_incidents || 0;
  const ransomwareRate = eduIncidents > 0 ? ((stats?.incidents_with_ransomware || 0) / eduIncidents * 100).toFixed(1) : "0";
  const breachRate = eduIncidents > 0 ? ((stats?.incidents_with_data_breach || 0) / eduIncidents * 100).toFixed(1) : "0";
  const avgDowntime = stats?.avg_recovery_days ? `${stats.avg_recovery_days}d` : "N/A";
  const mitreCount = stats?.incidents_with_mitre || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">Attack Intelligence</h1>
        </div>
        <p className="text-muted-foreground">
          Comprehensive analysis of attack vectors, techniques, and system impact across {eduIncidents} verified education incidents
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Verified Incidents" value={eduIncidents} icon={Shield} variant="primary" />
        <StatCard title="Ransomware Rate" value={`${ransomwareRate}%`} icon={Lock} variant="danger" />
        <StatCard title="Data Breach Rate" value={`${breachRate}%`} icon={Database} variant="warning" />
        <StatCard title="Avg Downtime" value={avgDowntime} icon={Target} variant="purple" />
        <StatCard title="MITRE Mapped" value={mitreCount} icon={Crosshair} variant="success" />
      </div>

      {/* Attack Trends - Full Width */}
      {attackTrends && <AttackTrendChart data={attackTrends.data} />}

      {/* Attack Flow Sankey - Full Width */}
      <AttackFlowSankey data={attackFlow} />

      {/* Attack Category + Attack Vector side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {attackTypes && <AttackTypeChart data={attackTypes.data} />}
        {attackVectors && <AttackVectorDonut data={attackVectors.data} />}
      </div>

      {/* MITRE Heatmap - Full Width */}
      {mitreTactics && <MitreHeatmap data={mitreTactics.data} />}

      {/* MITRE Sunburst - Full Width */}
      <MitreSunburst data={mitreSunburst} />

      {/* Breach Severity Timeline - Full Width */}
      {breachSeverity && <BreachSeverityTimeline data={breachSeverity} />}

      {/* Initial Access + System Impact side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {initialAccess && <InitialAccessTreemap data={initialAccess.data} />}
        {systemImpact && <SystemImpactChart data={systemImpact.data} />}
      </div>

      {/* Attack Vector by Institution - Full Width */}
      {attackVectorByInst && <AttackVectorByInstitution data={attackVectorByInst} />}
    </div>
  );
}
