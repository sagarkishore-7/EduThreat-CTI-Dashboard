"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getStats,
  getThreatActors,
  getThreatActorCategories,
  getThreatActorMotivations,
  getThreatActorTimeline,
  getActorRansomwareMatrix,
  getActorTargeting,
  getActorInstitutionTargeting,
  getActorTTPProfile,
} from "@/lib/api";
import type { ActorInstitutionResponse, ActorTTPResponse } from "@/lib/api";
import { ActorInstitutionMatrix } from "@/components/charts/ActorInstitutionMatrix";
import { ActorTTPProfile } from "@/components/charts/ActorTTPProfile";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { formatDate, getCountryFlag, cn, formatAttackCategory } from "@/lib/utils";
import {
  Users,
  Target,
  Globe2,
  AlertTriangle,
  Calendar,
  Shield,
  Crosshair,
} from "lucide-react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";

const COLORS = ["#06b6d4", "#8b5cf6", "#22c55e", "#f97316", "#ef4444", "#ec4899", "#eab308"];

const tooltipStyle = {
  contentStyle: { backgroundColor: "#111118", border: "1px solid #27272a", borderRadius: "8px" },
  labelStyle: { color: "#06b6d4" },
  itemStyle: { color: "#e4e4e7" },
};

export default function ThreatActorIntelligencePage() {
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: getStats });
  const { data: actors, isLoading: l1 } = useQuery({ queryKey: ["threat-actors-full"], queryFn: () => getThreatActors(30) });
  const { data: categories, isLoading: l2 } = useQuery({ queryKey: ["actor-categories"], queryFn: getThreatActorCategories });
  const { data: motivations, isLoading: l3 } = useQuery({ queryKey: ["actor-motivations"], queryFn: getThreatActorMotivations });
  const { data: actorTimeline, isLoading: l4 } = useQuery({ queryKey: ["actor-timeline"], queryFn: () => getThreatActorTimeline(10) });
  const { data: matrix, isLoading: l5 } = useQuery({ queryKey: ["actor-ransomware-matrix"], queryFn: getActorRansomwareMatrix });
  const { data: targeting, isLoading: l6 } = useQuery({ queryKey: ["actor-targeting"], queryFn: () => getActorTargeting(10) });
  const { data: actorInstitution, isLoading: l7 } = useQuery({ queryKey: ["actor-institution-targeting"], queryFn: () => getActorInstitutionTargeting(12) });
  const { data: actorTTP, isLoading: l8 } = useQuery({ queryKey: ["actor-ttp-profile"], queryFn: () => getActorTTPProfile(8) });

  const isLoading = l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 skeleton rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(9)].map((_, i) => <div key={i} className="h-48 skeleton rounded-xl" />)}
        </div>
      </div>
    );
  }

  const trackedActors = actors?.total || 0;
  const mostActive = actors?.threat_actors[0]?.name || "N/A";
  const countriesTargeted = stats?.countries_affected || 0;
  const avgPerActor = trackedActors > 0 ? (actors?.threat_actors.reduce((s, a) => s + a.incident_count, 0) || 0) / trackedActors : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">Threat Actor Intelligence</h1>
        </div>
        <p className="text-muted-foreground">
          {trackedActors} threat actors tracked across education sector incidents
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Tracked Actors" value={trackedActors} icon={Users} variant="primary" />
        <StatCard title="Most Active" value={mostActive} icon={Target} variant="danger" />
        <StatCard title="Countries Targeted" value={countriesTargeted} icon={Globe2} variant="warning" />
        <StatCard title="Avg Incidents/Actor" value={avgPerActor.toFixed(1)} icon={Crosshair} variant="purple" />
      </div>

      {/* Actor Category + Motivation side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Donut */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-lg font-semibold mb-4">Actor Category Distribution</h3>
          {categories && categories.data.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories.data.map(d => ({ name: formatAttackCategory(d.category), value: d.count }))}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={100}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {categories.data.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState />
          )}
        </div>

        {/* Motivation Bars */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-lg font-semibold mb-4">Actor Motivation Breakdown</h3>
          {motivations && motivations.data.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={motivations.data.map(d => ({ name: formatAttackCategory(d.category), value: d.count }))} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                  <XAxis type="number" stroke="#71717a" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={11} width={120} tickLine={false} axisLine={false} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>

      {/* Actor Activity Timeline - Full Width */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">Actor Activity Timeline</h3>
        {actorTimeline && actorTimeline.data.length > 0 ? (
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" type="category" stroke="#71717a" fontSize={11} allowDuplicatedCategory={false} />
                <YAxis dataKey="actor" type="category" stroke="#71717a" fontSize={11} width={120} />
                <Tooltip {...tooltipStyle} formatter={(value: number) => [`${value} incidents`, "Count"]} />
                <Scatter
                  data={actorTimeline.data}
                  fill="#06b6d4"
                >
                  {actorTimeline.data.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={COLORS[i % COLORS.length]}
                      r={Math.max(4, Math.min(entry.count * 3, 15))}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Actor TTP Profile - Full Width */}
      {actorTTP && <ActorTTPProfile data={actorTTP} />}

      {/* Actor-Ransomware Matrix */}
      {matrix && matrix.actors.length > 0 && matrix.families.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-lg font-semibold mb-4">Actor-Ransomware Matrix</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 text-muted-foreground">Actor</th>
                  {matrix.families.map(f => (
                    <th key={f} className="text-center p-2 text-muted-foreground text-xs">{f}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.actors.map(actor => (
                  <tr key={actor} className="border-t border-border">
                    <td className="p-2 font-medium">{actor}</td>
                    {matrix.families.map(family => {
                      const cell = matrix.matrix.find(m => m.actor === actor && m.family === family);
                      const count = cell?.count || 0;
                      return (
                        <td key={family} className="text-center p-2">
                          {count > 0 ? (
                            <span className="inline-block w-8 h-8 rounded bg-cyan-500/20 text-cyan-400 leading-8 font-medium" style={{ opacity: Math.min(0.3 + count * 0.2, 1) }}>
                              {count}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actor Institution Matrix - Full Width */}
      {actorInstitution && <ActorInstitutionMatrix data={actorInstitution} />}

      {/* Actor Targeting */}
      {targeting && targeting.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-lg font-semibold mb-4">Geographic Targeting by Actor</h3>
          <div className="space-y-4">
            {targeting.map(item => (
              <div key={item.actor}>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-purple-500" />
                  <span className="font-medium">{item.actor}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.countries.map(c => (
                    <span key={c.country} className="px-2 py-1 bg-secondary/50 rounded text-xs flex items-center gap-1">
                      {getCountryFlag(c.country)} {c.country} <span className="text-muted-foreground">({c.count})</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Threat Actor Cards */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Threat Actor Profiles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actors?.threat_actors.map((actor, index) => (
            <div
              key={actor.name}
              className={cn("bg-secondary/50 border border-border rounded-xl p-5 card-hover animate-slide-up")}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{actor.name}</h3>
                    <p className="text-sm text-muted-foreground">{actor.incident_count} incident{actor.incident_count !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <span className={cn("px-2 py-1 rounded text-xs font-medium",
                  actor.incident_count >= 10 ? "bg-red-500/20 text-red-400" :
                  actor.incident_count >= 5 ? "bg-orange-500/20 text-orange-400" :
                  "bg-yellow-500/20 text-yellow-400"
                )}>
                  {actor.incident_count >= 10 ? "High" : actor.incident_count >= 5 ? "Medium" : "Low"}
                </span>
              </div>
              {actor.countries_targeted.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Globe2 className="w-3 h-3" /> Countries
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {actor.countries_targeted.slice(0, 6).map(c => (
                      <span key={c} className="text-lg" title={c}>{getCountryFlag(c)}</span>
                    ))}
                    {actor.countries_targeted.length > 6 && (
                      <span className="text-xs text-muted-foreground">+{actor.countries_targeted.length - 6}</span>
                    )}
                  </div>
                </div>
              )}
              {actor.ransomware_families.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <AlertTriangle className="w-3 h-3" /> Ransomware
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {actor.ransomware_families.slice(0, 3).map(f => (
                      <span key={f} className="tag bg-red-500/20 text-red-400 border-red-500/30 text-xs">{f}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(actor.first_seen)}</div>
                <div>Last: {formatDate(actor.last_seen)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
