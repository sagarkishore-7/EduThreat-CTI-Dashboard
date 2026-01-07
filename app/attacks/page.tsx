"use client";

import { useQuery } from "@tanstack/react-query";
import { getAttackTypeAnalytics, getRansomwareAnalytics } from "@/lib/api";
import { formatAttackCategory, cn } from "@/lib/utils";
import { AlertTriangle, Shield, Lock, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function AttacksPage() {
  const { data: attackData, isLoading: attackLoading } = useQuery({
    queryKey: ["attacks-analytics"],
    queryFn: () => getAttackTypeAnalytics(20),
  });

  const { data: ransomwareData, isLoading: ransomwareLoading } = useQuery({
    queryKey: ["ransomware-analytics"],
    queryFn: () => getRansomwareAnalytics(20),
  });

  const isLoading = attackLoading || ransomwareLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-64 skeleton rounded-xl" />
        ))}
      </div>
    );
  }

  // Group attack types by category
  const ransomwareAttacks = attackData?.data.filter(
    (a) => a.category.includes("ransomware")
  ) || [];
  const phishingAttacks = attackData?.data.filter(
    (a) => a.category.includes("phishing") || a.category.includes("bec")
  ) || [];
  const otherAttacks = attackData?.data.filter(
    (a) => !a.category.includes("ransomware") && !a.category.includes("phishing") && !a.category.includes("bec")
  ) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">Attack Analysis</h1>
        </div>
        <p className="text-muted-foreground">
          Breakdown of attack types and techniques targeting education institutions
        </p>
      </div>

      {/* Attack Categories Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ransomware Section */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-red-500" />
            Ransomware Attacks
            <span className="ml-auto text-sm text-muted-foreground">
              {ransomwareAttacks.reduce((sum, a) => sum + a.count, 0)} total
            </span>
          </h2>
          <div className="space-y-3">
            {ransomwareAttacks.map((attack, index) => (
              <AttackTypeRow
                key={attack.category}
                category={attack.category}
                count={attack.count}
                percentage={attack.percentage}
                colorClass="bg-red-500"
                delay={index * 50}
              />
            ))}
          </div>
        </div>

        {/* Ransomware Families */}
        {ransomwareData && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-500" />
              Top Ransomware Families
              <span className="ml-auto text-sm text-muted-foreground">
                {ransomwareData.total} total
              </span>
            </h2>
            <div className="space-y-3">
              {ransomwareData.data.slice(0, 10).map((family, index) => (
                <Link
                  key={family.category}
                  href={`/incidents?ransomware_family=${family.category}`}
                  className={cn(
                    "block p-3 bg-secondary/50 rounded-lg border border-border",
                    "hover:border-primary/30 transition-all card-hover",
                    "animate-slide-up"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Lock className="w-4 h-4 text-purple-500" />
                      </div>
                      <span className="font-medium capitalize">
                        {family.category.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {family.count} incidents
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Other Attack Types */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          Other Attack Types
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {otherAttacks.map((attack, index) => (
            <Link
              key={attack.category}
              href={`/incidents?attack_category=${attack.category}`}
              className={cn(
                "p-4 bg-secondary/50 rounded-lg border border-border",
                "hover:border-primary/30 transition-all card-hover",
                "animate-slide-up"
              )}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">
                  {formatAttackCategory(attack.category)}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{attack.count}</span>
                <span className="text-sm text-muted-foreground">
                  ({attack.percentage}%)
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function AttackTypeRow({
  category,
  count,
  percentage,
  colorClass,
  delay,
}: {
  category: string;
  count: number;
  percentage: number;
  colorClass: string;
  delay: number;
}) {
  return (
    <Link
      href={`/incidents?attack_category=${category}`}
      className={cn(
        "block animate-slide-up"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">
          {formatAttackCategory(category)}
        </span>
        <span className="text-sm text-muted-foreground">
          {count} ({percentage}%)
        </span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", colorClass)}
          style={{ width: `${Math.min(percentage * 2, 100)}%` }}
        />
      </div>
    </Link>
  );
}

