"use client";

import { cn, formatNumber } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  change?: number;
  changeLabel?: string;
  variant?: "default" | "primary" | "danger" | "warning" | "success" | "purple" | "pink";
  href?: string;
  onClick?: () => void;
}

const variantStyles = {
  default: {
    icon: "bg-secondary text-muted-foreground",
    glow: "",
    accent: "group-hover:border-primary/30",
  },
  primary: {
    icon: "bg-cyan-500/10 text-cyan-500",
    glow: "hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]",
    accent: "group-hover:border-cyan-500/40",
  },
  danger: {
    icon: "bg-red-500/10 text-red-500",
    glow: "hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]",
    accent: "group-hover:border-red-500/40",
  },
  warning: {
    icon: "bg-yellow-500/10 text-yellow-500",
    glow: "hover:shadow-[0_0_20px_rgba(234,179,8,0.15)]",
    accent: "group-hover:border-yellow-500/40",
  },
  success: {
    icon: "bg-green-500/10 text-green-500",
    glow: "hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]",
    accent: "group-hover:border-green-500/40",
  },
  purple: {
    icon: "bg-purple-500/10 text-purple-500",
    glow: "hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]",
    accent: "group-hover:border-purple-500/40",
  },
  pink: {
    icon: "bg-pink-500/10 text-pink-500",
    glow: "hover:shadow-[0_0_20px_rgba(236,72,153,0.15)]",
    accent: "group-hover:border-pink-500/40",
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  change,
  changeLabel,
  variant = "default",
  href,
  onClick,
}: StatCardProps) {
  const styles = variantStyles[variant];
  const displayValue = typeof value === "number" ? formatNumber(value) : value;
  const isClickable = !!href || !!onClick;

  const content = (
    <div
      className={cn(
        "group stat-card bg-card border border-border rounded-xl p-5 transition-all duration-300",
        styles.glow,
        styles.accent,
        isClickable && "cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{displayValue}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1.5 truncate">{description}</p>
          )}
          {change !== undefined && (
            <p
              className={cn(
                "text-xs mt-2 flex items-center gap-1",
                change >= 0 ? "text-green-500" : "text-red-500"
              )}
            >
              {change >= 0 ? "↑" : "↓"} {Math.abs(change)}%
              {changeLabel && (
                <span className="text-muted-foreground">{changeLabel}</span>
              )}
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-lg shrink-0", styles.icon)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
