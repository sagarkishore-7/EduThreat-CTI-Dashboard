"use client";

import { useQuery } from "@tanstack/react-query";
import { getThreatActors } from "@/lib/api";
import { formatDate, getCountryFlag, cn } from "@/lib/utils";
import { Users, AlertTriangle, Globe2, Target, Calendar } from "lucide-react";

export default function ThreatActorsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["threat-actors"],
    queryFn: () => getThreatActors(30),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-48 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to Load Threat Actors</h2>
          <p className="text-muted-foreground">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">Threat Actors</h1>
        </div>
        <p className="text-muted-foreground">
          {data.total} threat actors identified across education sector incidents
        </p>
      </div>

      {/* Threat Actor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.threat_actors.map((actor, index) => (
          <div
            key={actor.name}
            className={cn(
              "bg-card border border-border rounded-xl p-5 card-hover animate-slide-up"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold">{actor.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {actor.incident_count} incident{actor.incident_count !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  "px-2 py-1 rounded text-xs font-medium",
                  actor.incident_count >= 10
                    ? "bg-red-500/20 text-red-400"
                    : actor.incident_count >= 5
                    ? "bg-orange-500/20 text-orange-400"
                    : "bg-yellow-500/20 text-yellow-400"
                )}
              >
                {actor.incident_count >= 10
                  ? "High Activity"
                  : actor.incident_count >= 5
                  ? "Medium"
                  : "Low"}
              </span>
            </div>

            {/* Countries Targeted */}
            {actor.countries_targeted.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <Globe2 className="w-3 h-3" />
                  Countries Targeted
                </div>
                <div className="flex flex-wrap gap-1">
                  {actor.countries_targeted.slice(0, 6).map((country) => (
                    <span
                      key={country}
                      className="text-lg"
                      title={country}
                    >
                      {getCountryFlag(country)}
                    </span>
                  ))}
                  {actor.countries_targeted.length > 6 && (
                    <span className="text-xs text-muted-foreground">
                      +{actor.countries_targeted.length - 6} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Ransomware Families */}
            {actor.ransomware_families.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <AlertTriangle className="w-3 h-3" />
                  Ransomware
                </div>
                <div className="flex flex-wrap gap-1">
                  {actor.ransomware_families.slice(0, 3).map((family) => (
                    <span
                      key={family}
                      className="tag bg-red-500/20 text-red-400 border-red-500/30 text-xs"
                    >
                      {family}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Activity Period */}
            <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                First seen: {formatDate(actor.first_seen)}
              </div>
              <div>Last: {formatDate(actor.last_seen)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

