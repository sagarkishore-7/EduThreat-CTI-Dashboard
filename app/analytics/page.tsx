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
import { PageHeader, PageSkeleton } from "@/components/PageHeader";
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

  if (isLoading) return <PageSkeleton rows={4} />;

  const eduIncidents = stats?.education_incidents || 0;
  const totalFinancial = stats?.total_financial_impact || 0;
  const avgRecovery = stats?.avg_recovery_days;
  const regulatoryActions = (regulatoryImpact?.fines_imposed || 0) + (regulatoryImpact?.lawsuits_count || 0);
  const disclosureRate = transparencyMetrics?.disclosure_rate || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={BarChart3}
        label="Impact Analytics"
        title="Impact Analytics"
        description={`Comprehensive impact analysis across ${eduIncidents} verified education sector incidents — financial, regulatory & recovery`}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
        <div className="bg-[#0d0d1a] border border-zinc-800 rounded-xl p-5">
          <p className="section-label mb-4">Data Impact Analysis</p>
          {dataImpact ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-zinc-900/40 rounded-lg border border-zinc-800">
                <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Breach Rate</p>
                <p className="text-2xl font-bold font-mono text-red-400">{dataImpact.breach_rate}%</p>
              </div>
              <div className="p-3 bg-zinc-900/40 rounded-lg border border-zinc-800">
                <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Exfiltration Rate</p>
                <p className="text-2xl font-bold font-mono text-purple-400">{dataImpact.exfiltration_rate}%</p>
              </div>
              <div className="p-3 bg-zinc-900/40 rounded-lg border border-zinc-800">
                <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Total Records</p>
                <p className="text-2xl font-bold font-mono">{dataImpact.total_records ? formatNumber(dataImpact.total_records) : "N/A"}</p>
              </div>
              <div className="p-3 bg-zinc-900/40 rounded-lg border border-zinc-800">
                <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Max Single Breach</p>
                <p className="text-2xl font-bold font-mono">{dataImpact.max_records ? formatNumber(dataImpact.max_records) : "N/A"}</p>
              </div>
              <div className="p-3 bg-zinc-900/40 rounded-lg border border-zinc-800 col-span-2">
                <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">PII Records Leaked</p>
                <p className="text-2xl font-bold font-mono text-orange-400">{dataImpact.total_pii_leaked ? formatNumber(dataImpact.total_pii_leaked) : "N/A"}</p>
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
        <div className="bg-[#0d0d1a] border border-zinc-800 rounded-xl p-6">
          <p className="section-label mb-4 flex items-center gap-1.5">
            <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
            Incidents by Country
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {countryData.data.map((item, index) => (
              <div
                key={item.category}
                className="p-4 bg-zinc-900/40 rounded-lg border border-zinc-800 animate-slide-up hover:border-zinc-700 transition-colors"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{getCountryFlag(item.category, item.flag_emoji)}</span>
                  <span className="text-[13px] font-medium text-zinc-300 truncate">{item.category}</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-mono text-zinc-100">{formatNumber(item.count)}</span>
                  <span className="text-xs text-zinc-600">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
