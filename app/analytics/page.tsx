"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getStats,
  getCountryAnalytics,
  getTimelineAnalytics,
  getInstitutionTypes,
  getInstitutionRiskMatrix,
  getFinancialImpact,
  getDataImpact,
  getRegulatoryImpact,
  getRecoveryByAttackType,
  getTransparencyMetrics,
  getUserImpact,
  getDisclosureTimeline,
  getBreachByInstitutionType,
  getCountryAttackMatrix,
} from "@/lib/api";
import { StatCard } from "@/components/StatCard";
import { IncidentTimeChart } from "@/components/charts/IncidentTimeChart";
import { CountryChart } from "@/components/charts/CountryChart";
import { InstitutionTypeChart } from "@/components/charts/InstitutionTypeChart";
import { InstitutionRiskMatrix } from "@/components/charts/InstitutionRiskMatrix";
import { FinancialImpactChart } from "@/components/charts/FinancialImpactChart";
import { RegulatoryComplianceGrid } from "@/components/charts/RegulatoryComplianceGrid";
import { RecoveryByAttackTypeChart } from "@/components/charts/RecoveryByAttackTypeChart";
import { DisclosureTimelineScatter } from "@/components/charts/DisclosureTimelineScatter";
import { DataBreachByInstitutionChart } from "@/components/charts/DataBreachByInstitutionChart";
import { TransparencyPanel } from "@/components/charts/TransparencyPanel";
import { UserImpactChart } from "@/components/charts/UserImpactChart";
import { CountryAttackChord } from "@/components/charts/CountryAttackChord";
import { formatCurrency, formatNumber, getCountryFlag, cn } from "@/lib/utils";
import {
  BarChart3,
  Building2,
  DollarSign,
  Clock,
  Scale,
  Eye,
  Globe2,
} from "lucide-react";

export default function ImpactAnalyticsPage() {
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: getStats });
  const { data: countryData, isLoading: l1 } = useQuery({ queryKey: ["analytics-countries"], queryFn: () => getCountryAnalytics(20) });
  const { data: timelineData, isLoading: l2 } = useQuery({ queryKey: ["analytics-timeline"], queryFn: () => getTimelineAnalytics(36) });
  const { data: institutionTypes, isLoading: l3 } = useQuery({ queryKey: ["institution-types"], queryFn: getInstitutionTypes });
  const { data: institutionRisk, isLoading: l4 } = useQuery({ queryKey: ["institution-risk-matrix"], queryFn: getInstitutionRiskMatrix });
  const { data: financialImpact, isLoading: l5 } = useQuery({ queryKey: ["financial-impact"], queryFn: getFinancialImpact });
  const { data: dataImpact, isLoading: l6 } = useQuery({ queryKey: ["data-impact"], queryFn: getDataImpact });
  const { data: regulatoryImpact, isLoading: l7 } = useQuery({ queryKey: ["regulatory-impact"], queryFn: getRegulatoryImpact });
  const { data: recoveryByAttackType, isLoading: l8 } = useQuery({ queryKey: ["recovery-by-attack-type"], queryFn: getRecoveryByAttackType });
  const { data: transparencyMetrics, isLoading: l9 } = useQuery({ queryKey: ["transparency-metrics"], queryFn: getTransparencyMetrics });
  const { data: userImpact, isLoading: l10 } = useQuery({ queryKey: ["user-impact"], queryFn: getUserImpact });
  const { data: disclosureTimeline, isLoading: l11 } = useQuery({ queryKey: ["disclosure-timeline"], queryFn: getDisclosureTimeline });
  const { data: breachByInstitution, isLoading: l12 } = useQuery({ queryKey: ["breach-by-institution"], queryFn: getBreachByInstitutionType });
  const { data: countryAttackMatrix, isLoading: l13 } = useQuery({ queryKey: ["country-attack-matrix"], queryFn: getCountryAttackMatrix });

  const isLoading = l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8 || l9 || l10 || l11 || l12 || l13;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-28 skeleton rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(6)].map((_, i) => <div key={i} className="h-[380px] skeleton rounded-xl" />)}
        </div>
      </div>
    );
  }

  const eduIncidents = stats?.education_incidents || 0;
  const totalFinancial = stats?.total_financial_impact || 0;
  const avgRecovery = stats?.avg_recovery_days;
  const regulatoryActions = (regulatoryImpact?.fines_imposed || 0) + (regulatoryImpact?.lawsuits_count || 0);
  const disclosureRate = transparencyMetrics?.disclosure_rate || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">Impact Analytics</h1>
        </div>
        <p className="text-muted-foreground">
          Comprehensive impact analysis across {eduIncidents} verified education sector incidents
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Institutions Affected" value={eduIncidents} icon={Building2} variant="primary" />
        <StatCard title="Financial Impact" value={formatCurrency(totalFinancial)} icon={DollarSign} variant="danger" />
        <StatCard title="Avg Recovery" value={avgRecovery ? `${avgRecovery}d` : "N/A"} icon={Clock} variant="warning" />
        <StatCard title="Regulatory Actions" value={regulatoryActions} icon={Scale} variant="purple" />
        <StatCard title="Disclosure Rate" value={`${disclosureRate}%`} icon={Eye} variant="success" />
      </div>

      {/* Incident Timeline - Full Width */}
      {timelineData && <IncidentTimeChart data={timelineData.data} />}

      {/* Institution Type + Operational Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {institutionTypes && <InstitutionTypeChart data={institutionTypes.data} />}
        {institutionRisk && <InstitutionRiskMatrix data={institutionRisk} />}
      </div>

      {/* Financial Impact - Full Width */}
      {financialImpact && <FinancialImpactChart data={financialImpact.data} />}

      {/* Data Impact + Regulatory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Impact Panel */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-lg font-semibold mb-4">Data Impact Analysis</h3>
          {dataImpact ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Breach Rate</p>
                <p className="text-2xl font-bold text-red-400">{dataImpact.breach_rate}%</p>
              </div>
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Exfiltration Rate</p>
                <p className="text-2xl font-bold text-purple-400">{dataImpact.exfiltration_rate}%</p>
              </div>
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Total Records Affected</p>
                <p className="text-2xl font-bold">{dataImpact.total_records ? formatNumber(dataImpact.total_records) : "N/A"}</p>
              </div>
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Max Records (Single)</p>
                <p className="text-2xl font-bold">{dataImpact.max_records ? formatNumber(dataImpact.max_records) : "N/A"}</p>
              </div>
              <div className="p-3 bg-secondary/50 rounded-lg col-span-2">
                <p className="text-xs text-muted-foreground">PII Records Leaked</p>
                <p className="text-2xl font-bold text-orange-400">{dataImpact.total_pii_leaked ? formatNumber(dataImpact.total_pii_leaked) : "N/A"}</p>
              </div>
            </div>
          ) : null}
        </div>

        {regulatoryImpact && <RegulatoryComplianceGrid data={regulatoryImpact} />}
      </div>

      {/* Data Breach by Institution Type - Full Width */}
      {breachByInstitution && <DataBreachByInstitutionChart data={breachByInstitution} />}

      {/* Recovery + Transparency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {recoveryByAttackType && <RecoveryByAttackTypeChart data={recoveryByAttackType} />}
        {transparencyMetrics && <TransparencyPanel data={transparencyMetrics} />}
      </div>

      {/* Disclosure Timeline - Full Width */}
      {disclosureTimeline && <DisclosureTimelineScatter data={disclosureTimeline} />}

      {/* User Impact - Full Width */}
      {userImpact && <UserImpactChart data={userImpact} />}

      {/* Country-Attack Chord Diagram - Full Width */}
      <CountryAttackChord data={countryAttackMatrix} />

      {/* Country Table */}
      {countryData && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-primary" />
            Incidents by Country
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {countryData.data.map((item, index) => (
              <div key={item.category} className={cn("p-4 bg-secondary/50 rounded-lg border border-border animate-slide-up")} style={{ animationDelay: `${index * 30}ms` }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getCountryFlag(item.category, item.flag_emoji)}</span>
                  <span className="font-medium">{item.category}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{formatNumber(item.count)}</span>
                  <span className="text-sm text-muted-foreground">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
