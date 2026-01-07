"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getRansomwareAnalytics, getIncidents } from "@/lib/api";
import { formatDate, getCountryFlag, cn } from "@/lib/utils";
import { Lock, AlertTriangle, ChevronRight, DollarSign, Target } from "lucide-react";

export default function RansomwarePage() {
  const { data: ransomwareData, isLoading } = useQuery({
    queryKey: ["ransomware-full"],
    queryFn: () => getRansomwareAnalytics(30),
  });

  const { data: recentRansomware } = useQuery({
    queryKey: ["recent-ransomware"],
    queryFn: () => getIncidents({ per_page: 10, ransomware_family: "lockbit" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-64 skeleton rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <Lock className="w-6 h-6 text-red-500" />
          <h1 className="text-xl font-semibold">Ransomware Tracking</h1>
        </div>
        <p className="text-muted-foreground">
          Track ransomware campaigns targeting educational institutions worldwide
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-sm text-muted-foreground">Total Ransomware Incidents</span>
          </div>
          <p className="text-3xl font-bold">{ransomwareData?.total || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Target className="w-5 h-5 text-purple-500" />
            </div>
            <span className="text-sm text-muted-foreground">Active Families</span>
          </div>
          <p className="text-3xl font-bold">{ransomwareData?.data.length || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <DollarSign className="w-5 h-5 text-yellow-500" />
            </div>
            <span className="text-sm text-muted-foreground">Most Active</span>
          </div>
          <p className="text-xl font-bold capitalize">
            {ransomwareData?.data[0]?.category.replace(/_/g, " ") || "Unknown"}
          </p>
        </div>
      </div>

      {/* Ransomware Families Grid */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Ransomware Families</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ransomwareData?.data.map((family, index) => (
            <Link
              key={family.category}
              href={`/incidents?ransomware_family=${family.category}`}
              className={cn(
                "p-4 bg-secondary/50 rounded-lg border border-border",
                "hover:border-red-500/30 transition-all card-hover group",
                "animate-slide-up"
              )}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                    <Lock className="w-5 h-5 text-red-500" />
                  </div>
                  <span className="font-semibold capitalize">
                    {family.category.replace(/_/g, " ")}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-bold">{family.count}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    incidents
                  </span>
                </div>
                <span className={cn(
                  "px-2 py-1 rounded text-xs font-medium",
                  family.percentage >= 20 ? "bg-red-500/20 text-red-400" :
                  family.percentage >= 10 ? "bg-orange-500/20 text-orange-400" :
                  "bg-yellow-500/20 text-yellow-400"
                )}>
                  {family.percentage}%
                </span>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{ width: `${Math.min(family.percentage * 3, 100)}%` }}
                />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Known Ransomware Groups Info */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">About Major Ransomware Families</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RansomwareInfoCard
            name="LockBit"
            description="One of the most active ransomware groups, known for their affiliate program and fast encryption speed. They target organizations across all sectors including education."
            aliases={["LockBit 2.0", "LockBit 3.0", "LockBit Black"]}
            color="red"
          />
          <RansomwareInfoCard
            name="BlackCat/ALPHV"
            description="Written in Rust, known for cross-platform capabilities and sophisticated data exfiltration tactics before encryption."
            aliases={["ALPHV", "Noberus"]}
            color="purple"
          />
          <RansomwareInfoCard
            name="Cl0p"
            description="Known for mass exploitation of vulnerabilities like MOVEit. Has targeted numerous educational institutions through third-party software."
            aliases={["Clop", "TA505"]}
            color="orange"
          />
          <RansomwareInfoCard
            name="Akira"
            description="Emerged in 2023, quickly became one of the most active ransomware groups targeting education and healthcare sectors."
            aliases={[]}
            color="cyan"
          />
        </div>
      </div>
    </div>
  );
}

function RansomwareInfoCard({
  name,
  description,
  aliases,
  color,
}: {
  name: string;
  description: string;
  aliases: string[];
  color: string;
}) {
  const colorClasses = {
    red: "bg-red-500/10 text-red-500 border-red-500/20",
    purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    orange: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    cyan: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  }[color] || "bg-gray-500/10 text-gray-500 border-gray-500/20";

  return (
    <div className="p-4 bg-secondary/50 rounded-lg border border-border">
      <h3 className="font-semibold mb-2 flex items-center gap-2">
        <Lock className={cn("w-4 h-4", colorClasses.split(" ")[1])} />
        {name}
      </h3>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      {aliases.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {aliases.map((alias) => (
            <span key={alias} className={cn("tag text-xs", colorClasses)}>
              {alias}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

