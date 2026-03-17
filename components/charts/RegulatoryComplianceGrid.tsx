"use client";

import {
  Scale,
  FileText,
  Bell,
  AlertTriangle,
  DollarSign,
  Gavel,
  Users,
  ShieldCheck,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface RegulatoryComplianceData {
  total: number;
  gdpr_count: number;
  hipaa_count: number;
  ferpa_count: number;
  notification_required: number;
  notifications_sent: number;
  fines_imposed: number;
  total_fines: number | null;
  lawsuits_count: number;
  class_action_count: number;
}

interface RegulatoryComplianceGridProps {
  data: RegulatoryComplianceData;
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

function MetricCard({ icon, label, value, color }: MetricCardProps) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-md ${color}`}>{icon}</div>
        <span className="text-xs text-zinc-400 font-medium">{label}</span>
      </div>
      <span className="text-xl font-bold text-zinc-100">{value}</span>
    </div>
  );
}

export function RegulatoryComplianceGrid({ data }: RegulatoryComplianceGridProps) {
  if (!data || data.total === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">Regulatory & Legal Impact</h3>
        <EmptyState message="No regulatory compliance data available" />
      </div>
    );
  }

  const notificationRate =
    data.notification_required > 0
      ? Math.round((data.notifications_sent / data.notification_required) * 100)
      : 0;

  const metrics = [
    {
      icon: <Scale className="w-4 h-4 text-cyan-400" />,
      label: "GDPR Affected",
      value: formatNumber(data.gdpr_count),
      color: "bg-cyan-500/15",
    },
    {
      icon: <ShieldCheck className="w-4 h-4 text-purple-400" />,
      label: "HIPAA Affected",
      value: formatNumber(data.hipaa_count),
      color: "bg-purple-500/15",
    },
    {
      icon: <FileText className="w-4 h-4 text-green-400" />,
      label: "FERPA Affected",
      value: formatNumber(data.ferpa_count),
      color: "bg-green-500/15",
    },
    {
      icon: <Bell className="w-4 h-4 text-orange-400" />,
      label: "Notifications Required",
      value: formatNumber(data.notification_required),
      color: "bg-orange-500/15",
    },
    {
      icon: <Bell className="w-4 h-4 text-emerald-400" />,
      label: "Notifications Sent",
      value: `${formatNumber(data.notifications_sent)} (${notificationRate}%)`,
      color: "bg-emerald-500/15",
    },
    {
      icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
      label: "Fines Imposed",
      value: formatNumber(data.fines_imposed),
      color: "bg-red-500/15",
    },
    {
      icon: <DollarSign className="w-4 h-4 text-yellow-400" />,
      label: "Total Fines",
      value: formatCurrency(data.total_fines),
      color: "bg-yellow-500/15",
    },
    {
      icon: <Gavel className="w-4 h-4 text-pink-400" />,
      label: "Lawsuits Filed",
      value: formatNumber(data.lawsuits_count),
      color: "bg-pink-500/15",
    },
    {
      icon: <Users className="w-4 h-4 text-blue-400" />,
      label: "Class Actions",
      value: formatNumber(data.class_action_count),
      color: "bg-blue-500/15",
    },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Regulatory & Legal Impact</h3>
        <span className="text-xs text-zinc-500">
          {formatNumber(data.total)} incidents analyzed
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>
    </div>
  );
}
