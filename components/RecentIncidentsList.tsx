"use client";

import Link from "next/link";
import type { RecentIncident } from "@/lib/api";
import {
  formatDate,
  formatAttackCategory,
  getAttackTypeColor,
  getCountryFlag,
  cn,
} from "@/lib/utils";
import { ChevronRight, Radio } from "lucide-react";

interface RecentIncidentsListProps {
  incidents: RecentIncident[];
}

const severityConfig: Record<string, { label: string; dot: string; text: string }> = {
  ransomware:      { label: "CRITICAL", dot: "bg-red-500",    text: "text-red-400" },
  data_breach:     { label: "HIGH",     dot: "bg-amber-500",  text: "text-amber-400" },
  phishing:        { label: "MEDIUM",   dot: "bg-yellow-500", text: "text-yellow-400" },
  malware:         { label: "HIGH",     dot: "bg-orange-500", text: "text-orange-400" },
  ddos:            { label: "MEDIUM",   dot: "bg-blue-500",   text: "text-blue-400" },
  unauthorized_access: { label: "HIGH", dot: "bg-amber-500",  text: "text-amber-400" },
  default:         { label: "MEDIUM",   dot: "bg-zinc-500",   text: "text-zinc-400" },
};

function getSeverity(attackCategory?: string) {
  if (!attackCategory) return severityConfig.default;
  return severityConfig[attackCategory.toLowerCase()] ?? severityConfig.default;
}

export function RecentIncidentsList({ incidents }: RecentIncidentsListProps) {
  return (
    <div className="bg-[#0c0c18] border border-zinc-800 rounded-lg flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
          <h3 className="text-[11px] uppercase tracking-widest font-semibold text-zinc-300">
            Live Threat Feed
          </h3>
        </div>
        <Link
          href="/incidents"
          className="text-[11px] text-zinc-500 hover:text-cyan-400 flex items-center gap-0.5 transition-colors"
        >
          All incidents <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60">
        {incidents.map((incident, index) => {
          const severity = getSeverity(incident.attack_category);
          return (
            <Link
              key={incident.incident_id}
              href={`/incidents/${incident.incident_id}`}
              className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors group"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              {/* Severity dot */}
              <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                <div className={cn("w-2 h-2 rounded-full shrink-0", severity.dot)} />
              </div>

              <div className="flex-1 min-w-0">
                {/* Institution + country */}
                <div className="flex items-center gap-1.5 mb-0.5">
                  {incident.country && (
                    <span className="text-base leading-none">
                      {getCountryFlag(incident.country)}
                    </span>
                  )}
                  <span className="text-[12px] font-medium text-zinc-200 truncate group-hover:text-cyan-300 transition-colors">
                    {incident.institution_name}
                  </span>
                </div>

                {/* Title */}
                {incident.title && (
                  <p className="text-[11px] text-zinc-600 truncate mb-1.5">
                    {incident.title}
                  </p>
                )}

                {/* Tags */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Severity badge */}
                  <span className={cn(
                    "inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-current/20",
                    severity.text
                  )}>
                    {severity.label}
                  </span>

                  {incident.attack_category && (
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded border border-current/20",
                      getAttackTypeColor(incident.attack_category)
                    )}>
                      {formatAttackCategory(incident.attack_category)}
                    </span>
                  )}
                  {incident.ransomware_family && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                      {incident.ransomware_family}
                    </span>
                  )}
                  {incident.threat_actor_name && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                      {incident.threat_actor_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Date */}
              <div className="text-[10px] text-zinc-600 font-mono whitespace-nowrap pt-0.5 shrink-0">
                {formatDate(incident.incident_date)}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
