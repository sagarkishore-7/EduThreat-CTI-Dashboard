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
import { ChevronRight, AlertTriangle } from "lucide-react";

interface RecentIncidentsListProps {
  incidents: RecentIncident[];
}

export function RecentIncidentsList({ incidents }: RecentIncidentsListProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recent Incidents</h3>
        <Link
          href="/incidents"
          className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
        >
          View all <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="space-y-3">
        {incidents.map((incident, index) => (
          <Link
            key={incident.incident_id}
            href={`/incidents/${incident.incident_id}`}
            className={cn(
              "block p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors card-hover",
              "animate-fade-in"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {incident.country && (
                    <span className="text-lg">
                      {getCountryFlag(incident.country)}
                    </span>
                  )}
                  <span className="font-medium truncate">
                    {incident.university_name}
                  </span>
                </div>
                {incident.title && (
                  <p className="text-sm text-muted-foreground truncate mb-2">
                    {incident.title}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {incident.attack_category && (
                    <span
                      className={cn(
                        "tag",
                        getAttackTypeColor(incident.attack_category)
                      )}
                    >
                      {formatAttackCategory(incident.attack_category)}
                    </span>
                  )}
                  {incident.ransomware_family && (
                    <span className="tag bg-red-500/20 text-red-400 border-red-500/30">
                      {incident.ransomware_family}
                    </span>
                  )}
                  {incident.threat_actor_name && (
                    <span className="tag bg-purple-500/20 text-purple-400 border-purple-500/30">
                      {incident.threat_actor_name}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(incident.incident_date)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

