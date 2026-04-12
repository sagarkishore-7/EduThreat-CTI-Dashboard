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
      "bg-[#0d0d1a] border border-zinc-800 rounded-lg p-5 relative overflow-hidden",
      className
    )}>
      {/* ambient */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-60"
        style={{ background: "radial-gradient(circle, rgba(34,211,238,0.04) 0%, transparent 70%)" }} />

      <div className="relative">
        <p className="section-label mb-2 flex items-center gap-1.5">
          <Icon className={cn("w-3.5 h-3.5", iconColor)} />
          {label}
        </p>
        <h1 className="text-xl font-bold text-zinc-100 mb-1">{title}</h1>
        <p className="text-[13px] text-zinc-500">{description}</p>
        {children && <div className="mt-4 pt-4 border-t border-zinc-800/60">{children}</div>}
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
