"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getStats,
  getRansomwareAnalytics,
  getRansomwareTimeline,
  getRansomwareFamiliesDetail,
  getRansomEconomics,
  getRansomwareRecovery,
  getRansomwareGeo,
  getRansomPaymentByYear,
  getRansomwareFamilyTrend,
  getRansomFlow,
} from "@/lib/api";
import { StatCard } from "@/components/StatCard";
import { RansomwareChart } from "@/components/charts/RansomwareChart";
import { RansomwareTimeline } from "@/components/charts/RansomwareTimeline";
import { RansomwareExfiltrationChart } from "@/components/charts/RansomwareExfiltrationChart";
import { RansomEconomicsPanel } from "@/components/charts/RansomEconomicsPanel";
import { RecoveryRadarChart } from "@/components/charts/RecoveryRadarChart";
import { RansomwareGeoGrid } from "@/components/charts/RansomwareGeoGrid";
import { RansomPaymentByYearChart } from "@/components/charts/RansomPaymentByYearChart";
import { RansomwareFamilyTrend } from "@/components/charts/RansomwareFamilyTrend";
import { RansomFlowSankey } from "@/components/charts/RansomFlowSankey";
import { PageHeader, PageSkeleton } from "@/components/PageHeader";
import {
  Lock,
  Target,
  DollarSign,
  AlertTriangle,
  Percent,
} from "lucide-react";

export default function RansomwareIntelligencePage() {
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: getStats });
  const { data: ransomwareData, isLoading: l1 } = useQuery({ queryKey: ["ransomware-full"], queryFn: () => getRansomwareAnalytics(30) });
  const { data: timeline, isLoading: l2 } = useQuery({ queryKey: ["ransomware-timeline"], queryFn: () => getRansomwareTimeline(15) });
  const { data: familiesDetail, isLoading: l3 } = useQuery({ queryKey: ["ransomware-families-detail"], queryFn: () => getRansomwareFamiliesDetail(15) });
  const { data: economics, isLoading: l4 } = useQuery({ queryKey: ["ransom-economics"], queryFn: getRansomEconomics });
  const { data: recovery, isLoading: l5 } = useQuery({ queryKey: ["ransomware-recovery"], queryFn: getRansomwareRecovery });
  const { data: geoData, isLoading: l6 } = useQuery({ queryKey: ["ransomware-geo"], queryFn: getRansomwareGeo });
  const { data: paymentByYear, isLoading: l7 } = useQuery({ queryKey: ["ransom-payment-by-year"], queryFn: getRansomPaymentByYear });
  const { data: familyTrend, isLoading: l8 } = useQuery({ queryKey: ["ransomware-family-trend"], queryFn: () => getRansomwareFamilyTrend() });
  const { data: ransomFlow, isLoading: l9 } = useQuery({ queryKey: ["ransom-flow"], queryFn: getRansomFlow });

  const isLoading = l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8 || l9;

  if (isLoading) return <PageSkeleton rows={4} />;

  const ransomwareIncidents = stats?.incidents_with_ransomware || 0;
  const activeFamilies = ransomwareData?.data.length || 0;
  const demandedCount = economics?.demanded_count || 0;
  const avgDemanded = economics?.avg_demanded;
  const paymentRate = economics?.payment_rate || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={Lock}
        iconColor="text-red-400"
        label="Ransomware Intelligence"
        title="Ransomware Intelligence"
        description={`Deep analysis of ${ransomwareIncidents} ransomware campaigns targeting education institutions — families, economics & recovery`}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard title="Ransomware Incidents" value={ransomwareIncidents} icon={Lock} variant="danger" />
        <StatCard title="Active Families" value={activeFamilies} icon={Target} variant="purple" />
        <StatCard title="Ransom Demanded" value={demandedCount} icon={AlertTriangle} variant="warning" />
        <StatCard title="Avg Ransom" value={avgDemanded ? `$${Math.round(avgDemanded).toLocaleString()}` : "N/A"} icon={DollarSign} variant="primary" />
        <StatCard title="Payment Rate" value={`${paymentRate}%`} icon={Percent} variant="pink" />
      </div>

      {/* Timeline - Full Width */}
      {timeline && <RansomwareTimeline data={timeline.data} />}

      {/* Family Trend - Full Width */}
      {familyTrend && <RansomwareFamilyTrend data={familyTrend} />}

      {/* Family Distribution + Economics side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {familiesDetail && <RansomwareExfiltrationChart data={familiesDetail.data} />}
        {economics && <RansomEconomicsPanel data={economics} />}
      </div>

      {/* Payment By Year - Full Width */}
      {paymentByYear && <RansomPaymentByYearChart data={paymentByYear} />}

      {/* Ransomware Payment Flow Sankey - Full Width */}
      <RansomFlowSankey data={ransomFlow} />

      {/* Recovery Comparison + Family Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {recovery && <RecoveryRadarChart data={recovery} />}
        {ransomwareData && <RansomwareChart data={ransomwareData.data} />}
      </div>

      {/* Geographic Targeting - Full Width */}
      {geoData && <RansomwareGeoGrid data={geoData} />}
    </div>
  );
}
