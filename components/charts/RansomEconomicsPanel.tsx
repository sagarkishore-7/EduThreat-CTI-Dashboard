"use client";

import { DollarSign, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";

interface RansomEconomicsData {
  total_ransomware: number;
  demanded_count: number;
  paid_count: number;
  payment_rate: number;
  total_demanded: number | null;
  avg_demanded: number | null;
  max_demanded: number | null;
  total_paid: number | null;
  avg_paid: number | null;
}

interface RansomEconomicsPanelProps {
  data: RansomEconomicsData;
}

interface MetricBoxProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  highlight?: boolean;
}

function MetricBox({ label, value, icon, highlight = false }: MetricBoxProps) {
  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        highlight
          ? "border-red-500/30 bg-red-500/5"
          : "border-border bg-zinc-900/50"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

export function RansomEconomicsPanel({ data }: RansomEconomicsPanelProps) {
  if (!data || data.total_ransomware === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">Ransom Economics</h3>
        <EmptyState message="No ransom economics data available" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">Ransom Economics</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Row 1 */}
        <MetricBox
          label="Total Ransomware Incidents"
          value={data.total_ransomware.toLocaleString()}
          icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
          highlight
        />
        <MetricBox
          label="Ransom Demanded"
          value={data.demanded_count.toLocaleString()}
          icon={<AlertTriangle className="w-4 h-4" />}
        />
        <MetricBox
          label="Ransom Paid"
          value={data.paid_count.toLocaleString()}
          icon={<DollarSign className="w-4 h-4 text-red-400" />}
          highlight
        />
        <MetricBox
          label="Payment Rate"
          value={`${data.payment_rate.toFixed(1)}%`}
          icon={<AlertTriangle className="w-4 h-4" />}
        />

        {/* Row 2 */}
        <MetricBox
          label="Total Demanded (USD)"
          value={formatCurrency(data.total_demanded)}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <MetricBox
          label="Avg Demanded"
          value={formatCurrency(data.avg_demanded)}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <MetricBox
          label="Max Demanded"
          value={formatCurrency(data.max_demanded)}
          icon={<DollarSign className="w-4 h-4 text-red-400" />}
          highlight
        />
        <MetricBox
          label="Total Paid"
          value={formatCurrency(data.total_paid)}
          icon={<DollarSign className="w-4 h-4" />}
        />
      </div>
    </div>
  );
}
