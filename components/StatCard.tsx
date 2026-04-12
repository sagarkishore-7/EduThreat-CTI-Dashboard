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
  size?: "default" | "compact";
}

const variantStyles = {
  default: {
    strip: "bg-zinc-600",
    icon: "text-zinc-400",
    iconBg: "bg-zinc-800/60",
    glow: "",
    border: "border-zinc-800 hover:border-zinc-600",
    valueColor: "text-zinc-100",
  },
  primary: {
    strip: "bg-cyan-500",
    icon: "text-cyan-400",
    iconBg: "bg-cyan-500/10",
    glow: "hover:shadow-[0_0_24px_rgba(6,182,212,0.12)]",
    border: "border-zinc-800 hover:border-cyan-500/50",
    valueColor: "text-cyan-300",
  },
  danger: {
    strip: "bg-red-500",
    icon: "text-red-400",
    iconBg: "bg-red-500/10",
    glow: "hover:shadow-[0_0_24px_rgba(239,68,68,0.12)]",
    border: "border-zinc-800 hover:border-red-500/50",
    valueColor: "text-red-300",
  },
  warning: {
    strip: "bg-amber-500",
    icon: "text-amber-400",
    iconBg: "bg-amber-500/10",
    glow: "hover:shadow-[0_0_24px_rgba(245,158,11,0.12)]",
    border: "border-zinc-800 hover:border-amber-500/50",
    valueColor: "text-amber-300",
  },
  success: {
    strip: "bg-emerald-500",
    icon: "text-emerald-400",
    iconBg: "bg-emerald-500/10",
    glow: "hover:shadow-[0_0_24px_rgba(16,185,129,0.12)]",
    border: "border-zinc-800 hover:border-emerald-500/50",
    valueColor: "text-emerald-300",
  },
  purple: {
    strip: "bg-violet-500",
    icon: "text-violet-400",
    iconBg: "bg-violet-500/10",
    glow: "hover:shadow-[0_0_24px_rgba(139,92,246,0.12)]",
    border: "border-zinc-800 hover:border-violet-500/50",
    valueColor: "text-violet-300",
  },
  pink: {
    strip: "bg-pink-500",
    icon: "text-pink-400",
    iconBg: "bg-pink-500/10",
    glow: "hover:shadow-[0_0_24px_rgba(236,72,153,0.12)]",
    border: "border-zinc-800 hover:border-pink-500/50",
    valueColor: "text-pink-300",
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
  size = "default",
}: StatCardProps) {
  const styles = variantStyles[variant];
  const displayValue = typeof value === "number" ? formatNumber(value) : value;
  const isClickable = !!href || !!onClick;

  const content = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-[#0c0c18] transition-all duration-200",
        styles.glow,
        styles.border,
        isClickable && "cursor-pointer active:scale-[0.99]",
        size === "compact" ? "p-3" : "p-4"
      )}
      onClick={onClick}
    >
      {/* Left accent strip */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-[3px]", styles.strip)} />

      <div className="pl-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className={cn(
              "uppercase tracking-widest font-medium text-zinc-500",
              size === "compact" ? "text-[9px] mb-1" : "text-[10px] mb-2"
            )}>
              {title}
            </p>
            <p className={cn(
              "font-mono font-bold tracking-tight leading-none",
              styles.valueColor,
              size === "compact" ? "text-2xl" : "text-3xl"
            )}>
              {displayValue}
            </p>
            {description && size !== "compact" && (
              <p className="text-[11px] text-zinc-600 mt-2 truncate">
                {description}
              </p>
            )}
            {change !== undefined && (
              <p className={cn(
                "text-[11px] mt-2 flex items-center gap-1 font-mono",
                change >= 0 ? "text-emerald-500" : "text-red-500"
              )}>
                {change >= 0 ? "▲" : "▼"} {Math.abs(change)}%
                {changeLabel && (
                  <span className="text-zinc-600">{changeLabel}</span>
                )}
              </p>
            )}
          </div>
          <div className={cn(
            "rounded-md shrink-0 flex items-center justify-center",
            styles.iconBg,
            size === "compact" ? "p-2" : "p-2.5"
          )}>
            <Icon className={cn(styles.icon, size === "compact" ? "w-4 h-4" : "w-5 h-5")} />
          </div>
        </div>
      </div>

      {/* Subtle dot-grid overlay for cyber texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
