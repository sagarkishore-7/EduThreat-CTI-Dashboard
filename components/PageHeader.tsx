"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  icon: LucideIcon;
  iconColor?: string;
  label: string;
  title: string;
  description: string;
  children?: React.ReactNode;        // extra stats/badges
  className?: string;
}

export function PageHeader({
  icon: Icon,
  iconColor = "text-cyan-400",
  label,
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn(
      "ops-shell relative overflow-hidden p-5 md:p-6",
      className
    )}>
      {/* ambient */}
      <div
        className="absolute right-0 top-0 h-64 w-64 rounded-full opacity-70 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,216,180,0.08) 0%, transparent 72%)" }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full opacity-60 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(129,140,248,0.08) 0%, transparent 70%)" }}
      />

      <div className="relative">
        <p className="section-label mb-2 flex items-center gap-1.5">
          <Icon className={cn("w-3.5 h-3.5", iconColor)} />
          {label}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100 mb-1">{title}</h1>
        <p className="max-w-4xl text-[13px] text-zinc-500">{description}</p>
        {children && <div className="mt-5 border-t border-zinc-800/60 pt-4">{children}</div>}
      </div>
    </div>
  );
}

export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-[100px] bg-zinc-900 border border-zinc-800 rounded-lg" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-zinc-900 border border-zinc-800 rounded-lg" />)}
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-[360px] bg-zinc-900 border border-zinc-800 rounded-lg" />
      ))}
    </div>
  );
}
