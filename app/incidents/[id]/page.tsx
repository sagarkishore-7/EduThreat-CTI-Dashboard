"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getIncident, API_BASE } from "@/lib/api";
import { TlpBadge, deriveTlp } from "@/components/ui/TlpBadge";
import {
  formatDate, formatNumber, formatCurrency, formatAttackCategory,
  getAttackTypeColor, getCountryFlag, cn,
} from "@/lib/utils";
import {
  ArrowLeft, ExternalLink, Calendar, MapPin, Shield, Users, Database,
  DollarSign, Clock, AlertTriangle, FileText, Target, Skull, Lock,
  Eye, Scale, Building2, Globe, Activity, Zap, Server,
  BookOpen, Bookmark, Copy, CheckCircle2, Link2, Layers, Download,
  ChevronRight, Fingerprint, Terminal, Image, Radio,
} from "lucide-react";
import { useState, useEffect } from "react";

type Tab = "overview" | "timeline" | "mitre" | "impact" | "intelligence" | "sources";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview",     label: "Overview",     icon: FileText },
  { id: "intelligence", label: "Intelligence", icon: Fingerprint },
  { id: "timeline",     label: "Timeline",     icon: Clock },
  { id: "mitre",        label: "MITRE ATT&CK", icon: Target },
  { id: "impact",       label: "Impact",       icon: AlertTriangle },
  { id: "sources",      label: "Sources",      icon: Link2 },
];

// ── Kill Chain stages (MITRE ATT&CK tactic order) ────────────────────────────
const KILL_CHAIN_STAGES = [
  { id: "reconnaissance",       label: "Recon",          icon: "👁",  color: "violet" },
  { id: "initial_access",       label: "Initial Access", icon: "🔓",  color: "red" },
  { id: "execution",            label: "Execution",      icon: "⚡",  color: "orange" },
  { id: "persistence",          label: "Persistence",    icon: "🔒",  color: "amber" },
  { id: "privilege_escalation", label: "Priv. Escal.",   icon: "⬆",   color: "yellow" },
  { id: "lateral_movement",     label: "Lateral Move",   icon: "↔",   color: "orange" },
  { id: "exfiltration",         label: "Exfiltration",   icon: "📤",  color: "red" },
  { id: "encryption",           label: "Encryption",     icon: "🔐",  color: "red" },
  { id: "impact",               label: "Impact",         icon: "💥",  color: "rose" },
];

const STAGE_COLOR: Record<string, { active: string; glow: string; dim: string; dot: string }> = {
  violet: { active: "border-violet-500/60 bg-violet-500/10 text-violet-300", glow: "shadow-violet-500/30", dim: "border-zinc-800 bg-zinc-900/30 text-zinc-700", dot: "bg-violet-500" },
  red:    { active: "border-red-500/60 bg-red-500/10 text-red-300",          glow: "shadow-red-500/30",    dim: "border-zinc-800 bg-zinc-900/30 text-zinc-700", dot: "bg-red-500" },
  orange: { active: "border-orange-500/60 bg-orange-500/10 text-orange-300", glow: "shadow-orange-500/30", dim: "border-zinc-800 bg-zinc-900/30 text-zinc-700", dot: "bg-orange-400" },
  amber:  { active: "border-amber-500/60 bg-amber-500/10 text-amber-300",    glow: "shadow-amber-500/30",  dim: "border-zinc-800 bg-zinc-900/30 text-zinc-700", dot: "bg-amber-400" },
  yellow: { active: "border-yellow-500/60 bg-yellow-500/10 text-yellow-300", glow: "shadow-yellow-500/30", dim: "border-zinc-800 bg-zinc-900/30 text-zinc-700", dot: "bg-yellow-400" },
  rose:   { active: "border-rose-500/60 bg-rose-500/10 text-rose-300",       glow: "shadow-rose-500/30",   dim: "border-zinc-800 bg-zinc-900/30 text-zinc-700", dot: "bg-rose-500" },
};

function normalizeStage(s: string) { return s.toLowerCase().replace(/[\s\-]+/g, "_"); }

function KillChainFlow({ chain, mitre }: { chain: string[]; mitre?: { tactic?: string; technique_id?: string; technique_name?: string }[] }) {
  const [active, setActive] = useState<string | null>(null);
  const chainNorm = chain.map(normalizeStage);

  // Build tactic → techniques map for tooltip
  const tacticTechs = new Map<string, string[]>();
  for (const t of mitre ?? []) {
    if (t.tactic) {
      const key = normalizeStage(t.tactic);
      if (!tacticTechs.has(key)) tacticTechs.set(key, []);
      tacticTechs.get(key)!.push(`${t.technique_id ?? ""} ${t.technique_name ?? ""}`.trim());
    }
  }

  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3 flex items-center gap-1.5">
        <Radio className="w-3 h-3" /> Attack Kill Chain
        <span className="text-zinc-700">— {chainNorm.length} of {KILL_CHAIN_STAGES.length} stages observed</span>
      </p>
      <div className="relative overflow-x-auto pb-2">
        <div className="flex items-stretch gap-0 min-w-max">
          {KILL_CHAIN_STAGES.map((stage, i) => {
            const isActive = chainNorm.some(c => c.includes(stage.id) || stage.id.includes(c));
            const colors = STAGE_COLOR[stage.color];
            const isHovered = active === stage.id;
            const techs = tacticTechs.get(stage.id) ?? [];

            return (
              <div key={stage.id} className="flex items-center">
                <div className="relative group">
                  <button
                    onMouseEnter={() => setActive(stage.id)}
                    onMouseLeave={() => setActive(null)}
                    className={cn(
                      "flex flex-col items-center justify-center w-[90px] h-[72px] rounded-lg border transition-all duration-200 cursor-default",
                      isActive
                        ? cn(colors.active, "shadow-lg", colors.glow)
                        : colors.dim,
                      isHovered && isActive && "scale-105",
                    )}
                  >
                    <span className="text-base leading-none mb-1">{stage.icon}</span>
                    <span className="text-[10px] font-semibold text-center leading-tight px-1">{stage.label}</span>
                    {isActive && (
                      <span className={cn("w-1.5 h-1.5 rounded-full mt-1", colors.dot)} />
                    )}
                  </button>
                  {/* Tooltip */}
                  {isHovered && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-30 w-44 bg-[#0a0a14] border border-zinc-700 rounded-lg p-2.5 shadow-xl pointer-events-none">
                      <p className="text-[10px] font-semibold text-zinc-300 mb-1">{stage.label}</p>
                      {isActive ? (
                        techs.length > 0 ? (
                          <div className="space-y-0.5">
                            {techs.slice(0, 3).map((t, j) => (
                              <p key={j} className="text-[9px] text-zinc-500 truncate">{t}</p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[9px] text-zinc-500">Observed in this incident</p>
                        )
                      ) : (
                        <p className="text-[9px] text-zinc-600 italic">Not observed</p>
                      )}
                    </div>
                  )}
                </div>
                {i < KILL_CHAIN_STAGES.length - 1 && (
                  <div className="flex items-center">
                    <div className={cn("w-4 h-px", chainNorm.some(c => c.includes(KILL_CHAIN_STAGES[i + 1].id) || KILL_CHAIN_STAGES[i + 1].id.includes(c)) && isActive ? "bg-zinc-500" : "bg-zinc-800")} />
                    <ChevronRight className={cn("w-3 h-3 shrink-0", isActive ? "text-zinc-500" : "text-zinc-800")} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MitreByTactic({ techniques }: { techniques: { technique_id?: string; technique_name?: string; tactic?: string; description?: string; sub_techniques?: string[] }[] }) {
  const byTactic = new Map<string, typeof techniques>();
  for (const t of techniques) {
    const tactic = t.tactic || "Other";
    if (!byTactic.has(tactic)) byTactic.set(tactic, []);
    byTactic.get(tactic)!.push(t);
  }

  const tacticOrder = ["Initial Access", "Execution", "Persistence", "Privilege Escalation",
    "Defense Evasion", "Credential Access", "Discovery", "Lateral Movement",
    "Collection", "Command and Control", "Exfiltration", "Impact", "Other"];

  const sortedTactics = Array.from(byTactic.entries()).sort(([a], [b]) => {
    const ai = tacticOrder.indexOf(a), bi = tacticOrder.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const tacticColors: Record<string, string> = {
    "Initial Access":      "border-red-500/30 text-red-400",
    "Execution":           "border-orange-500/30 text-orange-400",
    "Persistence":         "border-amber-500/30 text-amber-400",
    "Privilege Escalation":"border-yellow-500/30 text-yellow-400",
    "Defense Evasion":     "border-lime-500/30 text-lime-400",
    "Credential Access":   "border-emerald-500/30 text-emerald-400",
    "Discovery":           "border-cyan-500/30 text-cyan-400",
    "Lateral Movement":    "border-sky-500/30 text-sky-400",
    "Collection":          "border-blue-500/30 text-blue-400",
    "Command and Control": "border-indigo-500/30 text-indigo-400",
    "Exfiltration":        "border-violet-500/30 text-violet-400",
    "Impact":              "border-rose-500/30 text-rose-400",
    "Other":               "border-zinc-700 text-zinc-500",
  };

  return (
    <div className="space-y-4">
      {/* Tactic swimlane columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {sortedTactics.map(([tactic, tacticTechs]) => {
          const cls = tacticColors[tactic] ?? "border-zinc-700 text-zinc-500";
          const borderCls = cls.split(" ")[0];
          const textCls   = cls.split(" ")[1];
          return (
            <div key={tactic} className={cn("rounded-lg border bg-zinc-900/20 overflow-hidden", borderCls)}>
              <div className={cn("px-3 py-2 border-b flex items-center justify-between", borderCls)}>
                <span className={cn("text-[11px] font-bold uppercase tracking-wider", textCls)}>{tactic}</span>
                <span className="text-[10px] font-mono text-zinc-600">{tacticTechs.length}</span>
              </div>
              <div className="p-2 space-y-1.5">
                {tacticTechs.map((t: { technique_id?: string; technique_name?: string; description?: string; sub_techniques?: string[] }, i: number) => (
                  <a key={i}
                    href={`https://attack.mitre.org/techniques/${t.technique_id?.replace(".", "/")}/`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-2 p-2 rounded-md bg-zinc-900/40 hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700 transition-all group"
                  >
                    <code className={cn("text-[10px] font-mono shrink-0 mt-0.5", textCls)}>{t.technique_id}</code>
                    <div className="min-w-0">
                      <p className="text-[12px] text-zinc-300 group-hover:text-zinc-100 leading-tight">{t.technique_name}</p>
                      {t.description && (
                        <p className="text-[10px] text-zinc-600 mt-0.5 line-clamp-2">{t.description}</p>
                      )}
                      {t.sub_techniques && t.sub_techniques.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {t.sub_techniques.map((st: string, j: number) => (
                            <code key={j} className="text-[9px] font-mono text-zinc-600 bg-zinc-900 px-1 rounded">{st}</code>
                          ))}
                        </div>
                      )}
                    </div>
                    <ExternalLink className="w-2.5 h-2.5 text-zinc-700 shrink-0 opacity-0 group-hover:opacity-100 mt-0.5" />
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Coverage summary */}
      <div className="flex flex-wrap gap-1.5">
        {sortedTactics.map(([tactic, tacticTechList]) => {
          const cls = tacticColors[tactic] ?? "border-zinc-700 text-zinc-500";
          return (
            <span key={tactic} className={cn("tag text-[10px]", cls.split(" ")[0], cls.split(" ")[1])}>
              {tactic} <span className="font-mono ml-0.5 opacity-60">×{tacticTechList.length}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function IncidentDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const [tab, setTab] = useState<Tab>("overview");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    try {
      const raw = localStorage.getItem("visitedIncidents");
      const visited: string[] = raw ? JSON.parse(raw) : [];
      if (!visited.includes(id)) {
        localStorage.setItem("visitedIncidents", JSON.stringify([id, ...visited].slice(0, 500)));
      }
    } catch { /* ignore */ }
  }, [id]);

  const { data: incident, isLoading, error } = useQuery({
    queryKey: ["incident", id],
    queryFn: () => getIncident(id),
  });

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyBtn = ({ value, k, size = "sm" }: { value: string; k: string; size?: "sm" | "xs" }) => (
    <button onClick={() => copy(value, k)}
      className={cn("transition-colors rounded shrink-0", size === "xs" ? "p-0.5" : "p-1", "text-zinc-600 hover:text-zinc-300")}>
      {copied === k
        ? <CheckCircle2 className={size === "xs" ? "w-3 h-3 text-emerald-400" : "w-3.5 h-3.5 text-emerald-400"} />
        : <Copy className={size === "xs" ? "w-3 h-3" : "w-3.5 h-3.5"} />}
    </button>
  );

  const fromParam = searchParams.get("from");
  const listHref = fromParam ? `/incidents?${fromParam}` : "/incidents";

  if (isLoading) return <DetailSkeleton />;
  if (error || !incident) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-base font-semibold text-zinc-200">Incident not found</h2>
          <Link href="/incidents" className="text-sm text-cyan-400 hover:text-cyan-300">← Back to incidents</Link>
        </div>
      </div>
    );
  }

  const name = (incident.institution_name && incident.institution_name !== "Unknown")
    ? incident.institution_name : "Unknown Institution";
  const attackType = incident.attack_category || incident.attack_type_hint;
  const actorName = incident.threat_actor_name || incident.threat_actor;
  const ransomFamily = incident.attack_dynamics?.ransomware_family;
  const chain: string[] = incident.attack_dynamics?.attack_chain ?? [];
  const hasMitre    = (incident.mitre_attack_techniques?.length ?? 0) > 0;
  const hasTimeline = (incident.timeline?.length ?? 0) > 0 || !!incident.incident_date || !!incident.discovery_date;
  const hasImpact   = !!(incident.data_impact || incident.user_impact || incident.system_impact || incident.financial_impact || incident.regulatory_impact || incident.transparency_metrics);
  const hasIntel    = !!(actorName || incident.attack_dynamics || chain.length > 0);
  const hasSources  = (incident.all_urls?.length ?? 0) > 0 || !!incident.primary_url || !!incident.leak_site_url || !!incident.source_detail_url;
  const sourceDescription = incident.subtitle && !/news\.google\.com\/rss/i.test(incident.subtitle) ? incident.subtitle : null;

  const tabEnabled: Record<Tab, boolean> = {
    overview: true, intelligence: hasIntel, timeline: hasTimeline,
    mitre: hasMitre, impact: hasImpact, sources: hasSources,
  };

  // Parse infostealer stats from notes
  const infostealerNote = incident.notes?.match(/infostealer\([^)]+\)/)?.[0] ?? null;
  const dataSizeNote    = incident.notes?.match(/data_size=([^;]+)/)?.[1] ?? null;

  return (
    <div className="max-w-7xl mx-auto pb-16 space-y-4 animate-fade-in">

      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-1.5 text-[12px]">
        <Link href={listHref} className="text-zinc-500 hover:text-cyan-400 transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Incidents
        </Link>
        <ChevronRight className="w-3 h-3 text-zinc-700" />
        <span className="text-zinc-400 truncate max-w-xs">{name}</span>
      </div>

      {/* ── Hero header ── */}
      <div className="relative bg-[#0a0a14] border border-zinc-800 rounded-xl overflow-hidden">
        {/* Grid texture */}
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: "linear-gradient(rgba(34,211,238,1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,1) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(34,211,238,0.05) 0%, transparent 70%)" }} />
        {actorName && (
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full blur-3xl pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)" }} />
        )}

        <div className="relative p-5">
          <div className="flex flex-col lg:flex-row gap-5">
            {/* Left: identity */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-5xl leading-none shrink-0">{getCountryFlag(incident.country)}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-xl lg:text-2xl font-bold text-zinc-100 leading-tight">{name}</h1>
                    <CopyBtn value={name} k="name" />
                  </div>
                  <p className="text-[12px] text-zinc-500 capitalize">
                    {incident.institution_type?.replace(/_/g, " ")}
                    {incident.institution_size && <span className="ml-2 text-zinc-600">· {incident.institution_size.replace(/_/g, " ")}</span>}
                    {incident.country && <span className="ml-2 text-zinc-600">· {incident.country}{incident.region ? `, ${incident.region}` : ""}</span>}
                  </p>
                </div>
              </div>

              {/* Badge row */}
              <div className="flex flex-wrap items-center gap-1.5 mb-4">
                <TlpBadge
                  level={deriveTlp({
                    severity: incident.incident_severity,
                    attackCategory: attackType,
                    hasLeakSite: !!incident.leak_site_url,
                    publicDisclosure: incident.transparency_metrics?.public_disclosure,
                  })}
                />
                {incident.incident_severity && (() => {
                  const sevColor: Record<string, string> = {
                    critical: "bg-red-500/15 text-red-300 border-red-500/30",
                    high:     "bg-orange-500/15 text-orange-300 border-orange-500/30",
                    medium:   "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
                    low:      "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
                  };
                  return (
                    <span className={cn("tag font-semibold", sevColor[incident.incident_severity] ?? "bg-zinc-800 text-zinc-400 border-zinc-700")}>
                      <AlertTriangle className="w-2.5 h-2.5 mr-1" />{incident.incident_severity}
                    </span>
                  );
                })()}
                {attackType && (
                  <span className={cn("tag", getAttackTypeColor(attackType))}>
                    {formatAttackCategory(attackType)}
                  </span>
                )}
                {ransomFamily && (
                  <span className="tag bg-red-500/10 text-red-400 border-red-500/20">
                    <Lock className="w-2.5 h-2.5 mr-1" />{ransomFamily}
                  </span>
                )}
                {actorName && (
                  <span className="tag bg-violet-500/10 text-violet-400 border-violet-500/20">
                    <Skull className="w-2.5 h-2.5 mr-1" />{actorName}
                  </span>
                )}
                {incident.data_impact?.data_breached && (
                  <span className="tag bg-amber-500/10 text-amber-400 border-amber-500/20">
                    <Database className="w-2.5 h-2.5 mr-1" />data breach
                  </span>
                )}
                {dataSizeNote && (
                  <span className="tag bg-zinc-800 text-zinc-400 border-zinc-700">
                    {dataSizeNote} exfil
                  </span>
                )}
                {incident.llm_enriched && (
                  <span className="tag bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                    <CheckCircle2 className="w-2.5 h-2.5 mr-1" />analysis ready
                  </span>
                )}
              </div>

              {/* Compact kill chain preview (if available) */}
              {chain.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  <span className="text-[9px] uppercase tracking-widest text-zinc-600 mr-1">Chain</span>
                  {chain.map((stage, i) => (
                    <span key={i} className="flex items-center gap-0.5">
                      {i > 0 && <ChevronRight className="w-2.5 h-2.5 text-zinc-700" />}
                      <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">
                        {formatAttackCategory(stage)}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right: dates + actions */}
            <div className="flex flex-col gap-3 shrink-0 lg:items-end lg:min-w-[200px]">
              <div className="space-y-1.5">
                {incident.incident_date && (
                  <div className="flex items-center gap-1.5 text-[12px]">
                    <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="text-zinc-400 font-mono">{formatDate(incident.incident_date)}</span>
                    <span className="text-[9px] text-zinc-600 font-mono">{incident.date_precision}</span>
                  </div>
                )}
                {incident.discovery_date && incident.discovery_date !== incident.incident_date && (
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Eye className="w-3 h-3 text-zinc-600" />
                    <span className="text-zinc-500 font-mono">{formatDate(incident.discovery_date)}</span>
                    <span className="text-[9px] text-zinc-600">disclosed</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <Terminal className="w-3 h-3 text-zinc-600" />
                <code className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-500 max-w-[160px] truncate">
                  {incident.incident_id}
                </code>
                <CopyBtn value={incident.incident_id} k="id" size="xs" />
              </div>

              <div className="flex gap-2 flex-wrap lg:justify-end">
                {incident.primary_url && (
                  <a href={incident.primary_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />Source
                  </a>
                )}
                {incident.source_detail_url && (
                  <a href={incident.source_detail_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md border border-violet-500/30 text-violet-400 hover:bg-violet-500/10 transition-colors">
                    <Skull className="w-3.5 h-3.5" />RW.Live
                  </a>
                )}
                <a href={`${API_BASE}/api/v2/incidents/${incident.incident_id}/report`} download
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-colors">
                  <Download className="w-3.5 h-3.5" />CTI Report
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <QuickStat icon={MapPin}      label="Location"     value={incident.country || "Unknown"} sub={[incident.city, incident.region].filter(Boolean).join(", ")} />
        <QuickStat icon={Building2}   label="Institution"  value={incident.institution_type?.replace(/_/g, " ") || "Unknown"} />
        <QuickStat icon={Shield}      label="Attack Vector" value={formatAttackCategory(incident.attack_dynamics?.attack_vector) || "Unknown"} />
        <QuickStat icon={Database}    label="Records"       value={
          incident.data_impact?.records_affected_exact
            ? formatNumber(incident.data_impact.records_affected_exact)
            : incident.data_impact?.records_affected_min
            ? `≥${formatNumber(incident.data_impact.records_affected_min)}`
            : "N/A"
        } />
        <QuickStat icon={Users}       label="Individuals"  value={incident.user_impact?.total_individuals_affected ? formatNumber(incident.user_impact.total_individuals_affected) : "N/A"} />
        <QuickStat icon={AlertTriangle} label="Severity"   value={incident.incident_severity || "N/A"} />
      </div>

      {/* ── Tabs ── */}
      <div className="border-b border-zinc-800 flex gap-0 overflow-x-auto">
        {TABS.map(({ id: tid, label, icon: Icon }) => {
          const enabled = tabEnabled[tid];
          return (
            <button key={tid} onClick={() => enabled && setTab(tid)} disabled={!enabled}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium whitespace-nowrap border-b-2 transition-all",
                tab === tid
                  ? "border-cyan-400 text-cyan-300"
                  : enabled
                  ? "border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                  : "border-transparent text-zinc-700 cursor-not-allowed"
              )}>
              <Icon className="w-3.5 h-3.5" />{label}
              {!enabled && <span className="text-[9px] text-zinc-700">—</span>}
            </button>
          );
        })}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div className="space-y-4">
          {sourceDescription && (
            <Section icon={BookOpen} label="Source Description">
              <p className="text-[14px] text-zinc-400 leading-relaxed">{sourceDescription}</p>
            </Section>
          )}
          {incident.enriched_summary && (
            <Section icon={FileText} label="Intelligence Summary" badge="Structured Analysis">
              <p className="text-[14px] text-zinc-400 leading-relaxed whitespace-pre-wrap">{incident.enriched_summary}</p>
            </Section>
          )}
          {incident.initial_access_description && (
            <Section icon={Activity} label="Initial Access Method">
              <p className="text-[14px] text-zinc-400 leading-relaxed">{incident.initial_access_description}</p>
            </Section>
          )}
          {!incident.enriched_summary && !sourceDescription && !incident.initial_access_description && (
            <EmptyTab message="No analytical narrative is available for this incident yet." />
          )}
        </div>
      )}

      {/* ── INTELLIGENCE ── */}
      {tab === "intelligence" && (
        <div className="space-y-4">

          {/* Kill chain flow */}
          {chain.length > 0 && (
            <Section icon={Zap} label="Attack Chain">
              <KillChainFlow chain={chain} mitre={incident.mitre_attack_techniques ?? []} />
            </Section>
          )}

          {/* Threat actor card */}
          {actorName && (
            <div className="relative bg-[#0a0a14] border border-violet-500/25 rounded-xl overflow-hidden">
              <div className="absolute inset-0 opacity-[0.02]"
                style={{ backgroundImage: "linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)" }} />
              <div className="relative p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Skull className="w-4 h-4 text-violet-400" />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-violet-400">Threat Actor Profile</p>
                </div>
                <div className="flex flex-col lg:flex-row gap-5">
                  {/* Actor name + meta */}
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center shrink-0">
                        <Skull className="w-5 h-5 text-violet-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-violet-200 capitalize">{actorName}</h3>
                        {incident.threat_actor_category && (
                          <p className="text-[12px] text-zinc-500 capitalize mt-0.5">{incident.threat_actor_category.replace(/_/g, " ")}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <DF label="Motivation"    value={incident.threat_actor_motivation?.replace(/_/g, " ")} />
                      <DF label="Origin"        value={incident.threat_actor_origin_country} />
                      <DF label="Attack Type"   value={formatAttackCategory(attackType)} />
                      <DF label="Ransomware"    value={ransomFamily} />
                    </div>
                  </div>

                  {/* Screenshot + CTI links */}
                  <div className="shrink-0 space-y-3 lg:w-64">
                    {incident.screenshot_url && (
                      <div className="relative rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900 group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={incident.screenshot_url} alt="Claim screenshot"
                          className="w-full h-32 object-cover object-top opacity-80 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                          <p className="text-[9px] text-zinc-400 flex items-center gap-1">
                            <Image className="w-2.5 h-2.5" />Claim page screenshot
                          </p>
                        </div>
                        <a href={incident.screenshot_url} target="_blank" rel="noopener noreferrer"
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity">
                          <ExternalLink className="w-5 h-5 text-white" />
                        </a>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      {incident.source_detail_url && (
                        <a href={incident.source_detail_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2.5 bg-violet-500/5 border border-violet-500/20 rounded-lg hover:bg-violet-500/10 transition-colors group">
                          <Skull className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                          <span className="text-[11px] text-violet-400 flex-1">Ransomware.live Page</span>
                          <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-violet-400 transition-colors" />
                        </a>
                      )}
                      {incident.leak_site_url && (
                        <div className="flex items-center gap-2 p-2.5 bg-red-500/5 border border-red-500/20 rounded-lg">
                          <Radio className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-red-400 font-mono truncate">{incident.leak_site_url.slice(0, 40)}…</p>
                            <p className="text-[9px] text-zinc-600 mt-0.5">Dark web claim URL — use Tor browser</p>
                          </div>
                          <CopyBtn value={incident.leak_site_url} k="leak" size="xs" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Infostealer panel */}
                {infostealerNote && (
                  <div className="mt-4 pt-4 border-t border-violet-500/15">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5">Infostealer Activity</p>
                    <code className="text-[11px] font-mono text-amber-400 bg-amber-500/5 border border-amber-500/15 px-3 py-1.5 rounded-md block">
                      {infostealerNote}
                    </code>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Attack dynamics */}
          {incident.attack_dynamics && (
            <Section icon={Zap} label="Attack Dynamics">
              {incident.attack_dynamics.attack_chain && incident.attack_dynamics.attack_chain.length > 0 && !chain.length && (
                <div className="mb-4">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Kill Chain</p>
                  <KillChainFlow chain={incident.attack_dynamics.attack_chain} mitre={incident.mitre_attack_techniques ?? []} />
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <DF label="Attack Vector"     value={formatAttackCategory(incident.attack_dynamics.attack_vector)} />
                <DF label="Ransomware Family" value={incident.attack_dynamics.ransomware_family} />
                <DF label="Data Exfiltration" value={incident.attack_dynamics.data_exfiltration != null ? (incident.attack_dynamics.data_exfiltration ? "Confirmed" : "None") : null} />
                <DF label="Encryption Impact" value={incident.attack_dynamics.encryption_impact} />
                <DF label="Ransom Demanded"   value={incident.attack_dynamics.ransom_demanded != null ? (incident.attack_dynamics.ransom_demanded ? "Yes" : "No") : null} />
                <DF label="Ransom Amount"     value={formatCurrency(incident.attack_dynamics.ransom_amount)} />
                <DF label="Ransom Paid"       value={incident.attack_dynamics.ransom_paid != null ? (incident.attack_dynamics.ransom_paid ? "Yes" : "No") : null} />
                <DF label="Recovery Time"     value={incident.attack_dynamics.recovery_timeframe_days ? `${incident.attack_dynamics.recovery_timeframe_days} days` : null} />
                <DF label="Business Impact"   value={incident.attack_dynamics.business_impact} />
              </div>
              {incident.attack_dynamics.operational_impact && incident.attack_dynamics.operational_impact.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Operational Impact</p>
                  <div className="flex flex-wrap gap-1.5">
                    {incident.attack_dynamics.operational_impact.map((op: string, i: number) => (
                      <span key={i} className="tag bg-zinc-800 text-zinc-400 border-zinc-700">{op}</span>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {!actorName && !incident.attack_dynamics && chain.length === 0 && (
            <EmptyTab message="No threat intelligence data available for this incident." />
          )}
        </div>
      )}

      {/* ── TIMELINE ── */}
      {tab === "timeline" && (() => {
        const eventTypeStyleMap: Record<string, { tag: string; dot: string }> = {
          incident:       { tag: "bg-red-500/10 text-red-400 border-red-500/20",      dot: "bg-red-500" },
          initial_access: { tag: "bg-red-500/10 text-red-400 border-red-500/20",      dot: "bg-red-500" },
          discovery:      { tag: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-400" },
          source:         { tag: "bg-violet-500/10 text-violet-400 border-violet-500/20", dot: "bg-violet-500" },
          disclosure:     { tag: "bg-sky-500/10 text-sky-400 border-sky-500/20",       dot: "bg-sky-400" },
          containment:    { tag: "bg-sky-500/10 text-sky-400 border-sky-500/20",       dot: "bg-sky-400" },
          eradication:    { tag: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",    dot: "bg-cyan-400" },
          recovery:       { tag: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
          exfiltration:   { tag: "bg-orange-500/10 text-orange-400 border-orange-500/20", dot: "bg-orange-400" },
          encryption:     { tag: "bg-red-500/10 text-red-400 border-red-500/20",      dot: "bg-red-500" },
          ransom:         { tag: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", dot: "bg-yellow-400" },
          notification:   { tag: "bg-blue-500/10 text-blue-400 border-blue-500/20",   dot: "bg-blue-400" },
        };
        const defaultStyle = { tag: "bg-zinc-800 text-zinc-400 border-zinc-700", dot: "bg-zinc-600" };
        const getStyle = (typeKey: string) => {
          const k = typeKey.toLowerCase().replace(/[_\s]+/g, "_");
          for (const [key, val] of Object.entries(eventTypeStyleMap)) {
            if (k.includes(key)) return val;
          }
          return defaultStyle;
        };

        type Entry = { date: string; label: string; typeKey: string; description?: string; datePrecision?: string; actorAttribution?: string; indicators?: string[]; isKeyDate: boolean };
        const llmByDate = new Map<string, { description?: string; datePrecision?: string; actorAttribution?: string; indicators?: string[] }>();
        for (const ev of incident.timeline ?? []) {
          if (ev.date && ev.event_description && !llmByDate.has(ev.date))
            llmByDate.set(ev.date, { description: ev.event_description, datePrecision: ev.date_precision, actorAttribution: ev.actor_attribution, indicators: ev.indicators });
        }

        const keyDates = new Set<string>();
        const entries: Entry[] = [];
        const pushKey = (date: string, label: string, typeKey: string) => {
          keyDates.add(date);
          const llm = llmByDate.get(date);
          entries.push({ date, label, typeKey, isKeyDate: true, description: llm?.description, datePrecision: llm?.datePrecision, actorAttribution: llm?.actorAttribution, indicators: llm?.indicators });
        };
        if (incident.incident_date)  pushKey(incident.incident_date, "Incident Date", "incident");
        if (incident.discovery_date) pushKey(incident.discovery_date, "Claim / Discovery", "discovery");
        if (incident.transparency_metrics?.public_disclosure_date) pushKey(incident.transparency_metrics.public_disclosure_date, "Public Disclosure", "disclosure");
        if (incident.source_published_date) pushKey(incident.source_published_date, "Source Published", "source");

        for (const ev of incident.timeline ?? []) {
          if (!ev.date || (keyDates.has(ev.date) && !ev.event_type)) continue;
          entries.push({ date: ev.date, label: ev.event_type ? formatAttackCategory(ev.event_type) : "Event", typeKey: ev.event_type ?? "event", description: ev.event_description, datePrecision: ev.date_precision, actorAttribution: ev.actor_attribution, indicators: ev.indicators, isKeyDate: false });
        }
        entries.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
        if (entries.length === 0) return <EmptyTab message="No timeline data available." />;

        return (
          <Section icon={Clock} label="Incident Timeline" count={entries.length}>
            <div className="space-y-0">
              {entries.map((entry, i) => {
                const style = getStyle(entry.typeKey);
                const isLast = i === entries.length - 1;
                return (
                  <div key={i} className="relative pl-8">
                    {!isLast && <div className="absolute left-[13px] top-7 bottom-0 w-px bg-zinc-800" />}
                    <div className={cn("absolute left-0 top-1.5 w-[26px] h-[26px] rounded-full border-2 border-zinc-800 flex items-center justify-center bg-[#0a0a14]")}>
                      <div className={cn("w-2 h-2 rounded-full", style.dot)} />
                    </div>
                    <div className={cn("mb-5 bg-zinc-900/40 border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 transition-colors", isLast && "mb-0")}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12px] font-mono text-zinc-300 font-semibold">{formatDate(entry.date)}</span>
                        <span className={cn("tag", style.tag)}>{entry.label}</span>
                        {entry.datePrecision && entry.datePrecision !== "exact" && (
                          <span className="text-[9px] font-mono text-zinc-600">({entry.datePrecision})</span>
                        )}
                        {entry.actorAttribution && (
                          <span className="tag bg-violet-500/10 text-violet-400 border-violet-500/20">{entry.actorAttribution}</span>
                        )}
                      </div>
                      {entry.description && <p className="text-[13px] text-zinc-400 mt-1.5 leading-relaxed">{entry.description}</p>}
                      {entry.indicators && entry.indicators.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {entry.indicators.map((ioc, j) => (
                            <code key={j} className="text-[10px] font-mono bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-500">{ioc}</code>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        );
      })()}

      {/* ── MITRE ATT&CK ── */}
      {tab === "mitre" && incident.mitre_attack_techniques && (
        <Section icon={Target} label="MITRE ATT&CK Coverage" count={incident.mitre_attack_techniques.length}
          headerRight={
            <a href="https://attack.mitre.org/" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-cyan-400 transition-colors">
              <ExternalLink className="w-3 h-3" />Framework
            </a>
          }>
          <MitreByTactic techniques={incident.mitre_attack_techniques} />
        </Section>
      )}

      {/* ── IMPACT ── */}
      {tab === "impact" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {incident.data_impact && (
              <div className="bg-zinc-900/30 border border-cyan-500/15 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-[12px] font-semibold text-zinc-300">Data Impact</h3>
                </div>
                <div className="space-y-1.5 mb-3">
                  {[
                    { label: "Data Breached",    value: incident.data_impact.data_breached != null ? (incident.data_impact.data_breached ? "Confirmed" : "None") : null, alert: !!incident.data_impact.data_breached },
                    { label: "Exfiltrated",      value: incident.data_impact.data_exfiltrated != null ? (incident.data_impact.data_exfiltrated ? "Yes" : "No") : null },
                    { label: "Records Affected", value: formatNumber(incident.data_impact.records_affected_exact) || (incident.data_impact.records_affected_min ? `≥${formatNumber(incident.data_impact.records_affected_min)}` : null) },
                    { label: "PII Records",      value: formatNumber(incident.data_impact.pii_records_leaked) },
                  ].filter(f => f.value).map((f, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-zinc-600">{f.label}</span>
                      <span className={cn("text-[12px] font-mono", f.alert ? "text-red-400" : "text-zinc-300")}>{f.value}</span>
                    </div>
                  ))}
                </div>
                {incident.data_impact.data_categories && incident.data_impact.data_categories.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5">Data Categories</p>
                    <div className="flex flex-wrap gap-1">
                      {incident.data_impact.data_categories.map((cat: string, i: number) => (
                        <span key={i} className="tag bg-cyan-500/10 text-cyan-300 border-cyan-500/20 text-[10px]">
                          {cat.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {incident.user_impact && (
              <ImpactCard icon={Users} title="User Impact" accent="violet" fields={[
                { label: "Students",  value: formatNumber(incident.user_impact.students_affected) },
                { label: "Staff",     value: formatNumber(incident.user_impact.staff_affected) },
                { label: "Faculty",   value: formatNumber(incident.user_impact.faculty_affected) },
                { label: "Alumni",    value: formatNumber(incident.user_impact.alumni_affected) },
                { label: "Total",     value: formatNumber(incident.user_impact.total_individuals_affected), bold: true },
              ]} />
            )}
            {incident.system_impact && (
              <div className="bg-zinc-900/30 border border-orange-500/15 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Server className="w-4 h-4 text-orange-400" />
                  <h3 className="text-[12px] font-semibold text-zinc-300">System Impact</h3>
                </div>
                {incident.system_impact.systems_affected && incident.system_impact.systems_affected.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5">Systems Affected</p>
                    <div className="flex flex-wrap gap-1">
                      {incident.system_impact.systems_affected.map((s: string, i: number) => (
                        <span key={i} className="tag bg-orange-500/10 text-orange-300 border-orange-500/20 text-[10px]">{s.replace(/_/g, " ")}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  {[
                    { label: "Critical Systems",   val: incident.system_impact.critical_systems_affected, alert: true },
                    { label: "Network",            val: incident.system_impact.network_compromised, alert: true },
                    { label: "Email",              val: incident.system_impact.email_system_affected },
                    { label: "Student Portal",     val: incident.system_impact.student_portal_affected },
                    { label: "Research Systems",   val: incident.system_impact.research_systems_affected },
                    { label: "Hospital Systems",   val: incident.system_impact.hospital_systems_affected },
                    { label: "Cloud Services",     val: incident.system_impact.cloud_services_affected },
                    { label: "Third-party Vendor", val: incident.system_impact.third_party_vendor_impact },
                  ].filter(r => r.val != null).map((r, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-zinc-600">{r.label}</span>
                      <span className={cn("text-[12px] font-mono", r.val ? (r.alert ? "text-red-400" : "text-orange-300") : "text-zinc-500")}>{r.val ? "Yes" : "No"}</span>
                    </div>
                  ))}
                  {incident.system_impact.vendor_name && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-zinc-600">Vendor</span>
                      <span className="text-[12px] font-mono text-zinc-300">{incident.system_impact.vendor_name}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {incident.financial_impact && (
              <ImpactCard icon={DollarSign} title="Financial Impact" accent="emerald" fields={[
                { label: "Total Cost",  value: formatCurrency(incident.financial_impact.estimated_total_cost_usd), bold: true },
                { label: "Ransom",      value: formatCurrency(incident.financial_impact.ransom_cost_usd) },
                { label: "Recovery",    value: formatCurrency(incident.financial_impact.recovery_cost_usd) },
                { label: "Legal",       value: formatCurrency(incident.financial_impact.legal_cost_usd) },
                { label: "Insurance",   value: incident.financial_impact.insurance_claim ? `Claimed${incident.financial_impact.insurance_payout_usd ? ` (${formatCurrency(incident.financial_impact.insurance_payout_usd)})` : ""}` : "None" },
              ]} />
            )}
            {incident.regulatory_impact && (
              <div className="bg-zinc-900/30 border border-red-500/15 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Scale className="w-4 h-4 text-red-400" />
                  <h3 className="text-[12px] font-semibold text-zinc-300">Regulatory</h3>
                </div>
                {(incident.regulatory_impact.gdpr_breach || incident.regulatory_impact.hipaa_breach || incident.regulatory_impact.ferpa_breach) && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {incident.regulatory_impact.gdpr_breach  && <span className="tag bg-red-500/15 text-red-300 border-red-500/30 font-semibold">GDPR</span>}
                    {incident.regulatory_impact.hipaa_breach && <span className="tag bg-red-500/15 text-red-300 border-red-500/30 font-semibold">HIPAA</span>}
                    {incident.regulatory_impact.ferpa_breach && <span className="tag bg-red-500/15 text-red-300 border-red-500/30 font-semibold">FERPA</span>}
                  </div>
                )}
                <div className="space-y-1.5">
                  {[
                    { label: "Notification Required", value: incident.regulatory_impact.breach_notification_required != null ? (incident.regulatory_impact.breach_notification_required ? "Yes" : "No") : null },
                    { label: "Notified",              value: incident.regulatory_impact.notification_sent != null ? (incident.regulatory_impact.notification_sent ? "Yes" : "No") : null },
                    { label: "Fine",                  value: incident.regulatory_impact.fine_imposed ? (formatCurrency(incident.regulatory_impact.fine_amount_usd) || "Yes") : (incident.regulatory_impact.fine_imposed === false ? "No" : null), alert: !!incident.regulatory_impact.fine_imposed },
                    { label: "Lawsuits",              value: incident.regulatory_impact.lawsuits_filed != null ? (incident.regulatory_impact.lawsuits_filed ? "Filed" : "None") : null },
                    { label: "Class Action",          value: incident.regulatory_impact.class_action_filed != null ? (incident.regulatory_impact.class_action_filed ? "Filed" : "None") : null },
                  ].filter(f => f.value).map((f, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-zinc-600">{f.label}</span>
                      <span className={cn("text-[12px] font-mono", (f as { alert?: boolean }).alert ? "text-red-400" : "text-zinc-300")}>{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {incident.transparency_metrics && (
              <ImpactCard icon={Eye} title="Transparency" accent="sky" fields={[
                { label: "Public Disclosure", value: incident.transparency_metrics.public_disclosure != null ? (incident.transparency_metrics.public_disclosure ? "Yes" : "No") : null },
                { label: "Disclosed",         value: formatDate(incident.transparency_metrics.public_disclosure_date) },
                { label: "Delay",             value: incident.transparency_metrics.disclosure_delay_days ? `${incident.transparency_metrics.disclosure_delay_days} days` : null },
                { label: "Level",             value: incident.transparency_metrics.transparency_level },
              ]} />
            )}
          </div>
          {incident.recovery_metrics && (
            <Section icon={Activity} label="Recovery & Response">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <DF label="Duration"        value={incident.recovery_metrics.recovery_duration_days ? `${incident.recovery_metrics.recovery_duration_days} days` : null} />
                <DF label="IR Firm"         value={incident.recovery_metrics.ir_firm_engaged} />
                <DF label="Forensics Firm"  value={incident.recovery_metrics.forensics_firm} />
                <DF label="Recovery Method" value={incident.recovery_metrics.recovery_method} />
                <DF label="Law Enforcement" value={incident.recovery_metrics.law_enforcement_involved != null ? (incident.recovery_metrics.law_enforcement_involved ? "Involved" : "Not involved") : null} />
                <DF label="Restored from Backup" value={incident.recovery_metrics.from_backup != null ? (incident.recovery_metrics.from_backup ? "Yes" : "No") : null} />
                <DF label="MFA Implemented" value={incident.recovery_metrics.mfa_implemented != null ? (incident.recovery_metrics.mfa_implemented ? "Yes" : "No") : null} />
              </div>
              {incident.recovery_metrics.security_improvements && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5">Security Improvements</p>
                  <p className="text-[13px] text-zinc-400">{incident.recovery_metrics.security_improvements}</p>
                </div>
              )}
            </Section>
          )}
        </div>
      )}

      {/* ── SOURCES ── */}
      {tab === "sources" && (
        <div className="space-y-4">
          {/* CTI Infrastructure */}
          {(incident.leak_site_url || incident.source_detail_url || incident.screenshot_url) && (
            <div className="bg-[#0a0a14] border border-red-500/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Radio className="w-4 h-4 text-red-400" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-red-400">CTI Infrastructure</p>
                <span className="text-[9px] font-mono text-zinc-600 ml-1">Direct from threat actor</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  {incident.source_detail_url && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5">Ransomware.live Profile</p>
                      <a href={incident.source_detail_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2.5 bg-violet-500/5 border border-violet-500/20 rounded-lg hover:bg-violet-500/10 transition-colors group">
                        <Skull className="w-4 h-4 text-violet-400 shrink-0" />
                        <span className="text-[12px] text-violet-300 font-mono truncate flex-1">{incident.source_detail_url}</span>
                        <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-violet-400" />
                      </a>
                    </div>
                  )}
                  {incident.leak_site_url && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5">Dark Web Claim URL</p>
                      <div className="flex items-start gap-2 p-2.5 bg-red-500/5 border border-red-500/20 rounded-lg">
                        <Radio className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-mono text-red-300 break-all">{incident.leak_site_url}</p>
                          <p className="text-[9px] text-zinc-600 mt-1 flex items-center gap-1">
                            ⚠ .onion URL — requires Tor Browser
                          </p>
                        </div>
                        <CopyBtn value={incident.leak_site_url} k="leak" />
                      </div>
                    </div>
                  )}
                </div>
                {incident.screenshot_url && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5">Claim Screenshot</p>
                    <div className="relative rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900 group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={incident.screenshot_url} alt="Claim screenshot"
                        className="w-full h-48 object-cover object-top opacity-80 group-hover:opacity-100 transition-opacity" />
                      <a href={incident.screenshot_url} target="_blank" rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                        <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-lg">
                          <Image className="w-4 h-4 text-white" />
                          <span className="text-[12px] text-white">View full size</span>
                        </div>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* News/Press URLs */}
          {(() => {
            const urlSet = new Set<string>(incident.all_urls ?? []);
            if (incident.primary_url) urlSet.add(incident.primary_url);
            const allUrls = Array.from(urlSet);
            return allUrls.length > 0 ? (
              <Section icon={Globe} label="News & Press Sources" count={allUrls.length}>
                <div className="space-y-1.5">
                  {allUrls.map((url, i) => {
                    const domain = getUrlDomain(url);
                    return (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2.5 bg-zinc-900/40 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors group">
                        <Globe className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-zinc-500 font-mono">{domain}</p>
                          <p className="text-[12px] font-mono text-cyan-400 truncate group-hover:underline">{url}</p>
                        </div>
                        {url === incident.primary_url && (
                          <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">primary</span>
                        )}
                        <ExternalLink className="w-3 h-3 text-zinc-700 shrink-0" />
                      </a>
                    );
                  })}
                </div>
              </Section>
            ) : null;
          })()}

          {incident.source_disclosure?.selected_source_reason && (
            <Section icon={Target} label="Why This Source Won">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <DF label="Selected Source" value={incident.source_disclosure.selected_source_reason.source_name} />
                <DF
                  label="Survivor Score"
                  value={
                    incident.source_disclosure.selected_source_reason.survivor_score != null
                      ? String(incident.source_disclosure.selected_source_reason.survivor_score)
                      : null
                  }
                />
                <DF
                  label="Fields Disclosed"
                  value={
                    incident.source_disclosure.selected_source_reason.field_count != null
                      ? String(incident.source_disclosure.selected_source_reason.field_count)
                      : null
                  }
                />
                <DF
                  label="Selection Basis"
                  value={humanizeDisclosureKey(incident.source_disclosure.selected_source_reason.selection_basis)}
                />
              </div>

              {incident.source_disclosure.selected_source_reason.why_selected && incident.source_disclosure.selected_source_reason.why_selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {incident.source_disclosure.selected_source_reason.why_selected.map((reason, idx) => (
                    <span key={`${reason}-${idx}`} className="tag bg-cyan-500/8 text-cyan-300 border-cyan-500/20">
                      {reason}
                    </span>
                  ))}
                </div>
              )}

              {incident.source_disclosure.selected_source_reason.score_breakdown && Object.keys(incident.source_disclosure.selected_source_reason.score_breakdown).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(incident.source_disclosure.selected_source_reason.score_breakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([key, value]) => (
                      <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">{humanizeScoreBreakdownKey(key)}</p>
                        <p className={cn("text-[13px] font-medium", value >= 0 ? "text-zinc-300" : "text-red-300")}>
                          {value >= 0 ? `+${value}` : value}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </Section>
          )}

          {(() => {
            const differences = (incident.source_disclosure?.field_differences ?? []).filter((field) => field.has_disparity);
            return differences.length > 0 ? (
              <Section icon={Layers} label="Reporting Differences" count={differences.length}>
                <div className="space-y-3">
                  {differences.map((difference) => (
                    <div key={difference.field} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-zinc-200">{difference.label}</p>
                          <p className="mt-1 text-[12px] text-zinc-400">
                            Canonical value:{" "}
                            <span className="text-cyan-300">
                              {difference.resolved_display_value || "Not disclosed"}
                            </span>
                            {difference.resolved_source_name ? ` via ${difference.resolved_source_name}` : ""}
                          </p>
                          {difference.resolved_source_is_selected === false && (
                            <p className="mt-1 text-[11px] text-amber-300">
                              Backfilled from a supporting source because the selected article did not disclose this field.
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="tag bg-zinc-800 text-zinc-300 border-zinc-700">
                            {difference.sources_with_value} source{difference.sources_with_value === 1 ? "" : "s"} reported
                          </span>
                          {difference.sources_missing_value > 0 && (
                            <span className="tag bg-amber-500/8 text-amber-300 border-amber-500/20">
                              {difference.sources_missing_value} missing
                            </span>
                          )}
                          {difference.distinct_value_count > 1 && (
                            <span className="tag bg-rose-500/8 text-rose-300 border-rose-500/20">
                              conflicting values
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {difference.reporting_sources.map((source, idx) => (
                          <span
                            key={`${difference.field}-${source.source_incident_id ?? idx}`}
                            className={cn(
                              "tag border",
                              source.has_value
                                ? source.is_primary_member
                                  ? "bg-cyan-500/8 text-cyan-300 border-cyan-500/20"
                                  : "bg-zinc-800 text-zinc-300 border-zinc-700"
                                : "bg-zinc-900 text-zinc-600 border-zinc-800"
                            )}
                          >
                            {source.source_name}
                            <span className="text-[9px] font-mono ml-1">
                              {source.has_value ? source.display_value || "reported" : "not disclosed"}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null;
          })()}

          {/* Data provenance */}
          {incident.sources && incident.sources.length > 0 && (
            <Section icon={Layers} label="Data Provenance">
              <div className="flex flex-wrap gap-1.5 mb-4">
                {incident.sources.map((src, i: number) => (
                  <span key={i} className="flex items-center gap-1.5 tag bg-zinc-800 text-zinc-300 border-zinc-700">
                    {src.source}
                    <span className="text-zinc-600 text-[9px] font-mono">{formatDate(src.first_seen_at)}</span>
                  </span>
                ))}
              </div>
              <div className="space-y-3 mb-4">
                {incident.sources.map((src, i: number) => {
                  const sourceUrls = dedupeSourceUrls(src.source_urls ?? []);
                  return (
                    <div key={`${src.source}-${src.source_event_id ?? i}`} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[12px] font-semibold text-zinc-200">{src.source}</p>
                            {src.source_group && (
                              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-500">
                                {src.source_group}
                              </span>
                            )}
                            {src.is_primary_member && (
                              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                primary member
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[12px] text-zinc-400 line-clamp-2">
                            {src.raw_title || src.raw_institution_name || "Source observation"}
                          </p>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-600 md:text-right">
                          <p>Seen {formatDate(src.first_seen_at)}</p>
                          {src.source_published_at && <p>Published {formatDate(src.source_published_at)}</p>}
                        </div>
                      </div>

                      {sourceUrls.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {sourceUrls.map((sourceUrl, urlIndex) => {
                            const displayUrl = getDisplayUrl(sourceUrl);
                            if (!displayUrl) return null;
                            const domain = getUrlDomain(displayUrl);
                            return (
                              <a
                                key={`${displayUrl}-${urlIndex}`}
                                href={displayUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-[#090912] px-2.5 py-2 hover:border-zinc-700 transition-colors group"
                              >
                                <Globe className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <p className="text-[11px] font-mono text-zinc-500">{domain}</p>
                                    {sourceUrl.url_kind && (
                                      <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-600">
                                        {sourceUrl.url_kind.replace(/_/g, " ")}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[12px] font-mono text-cyan-400 truncate group-hover:underline">
                                    {displayUrl}
                                  </p>
                                </div>
                                <ExternalLink className="w-3 h-3 text-zinc-700 shrink-0" />
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DF label="First Ingested"   value={formatDate(incident.ingested_at)} />
                <DF label="Analysis Updated" value={formatDate(incident.llm_enriched_at)} />
                <DF label="Source Published" value={formatDate(incident.source_published_date)} />
                <DF label="Discovery Date"   value={formatDate(incident.discovery_date)} />
              </div>
            </Section>
          )}

          {/* Research citation */}
          <Section icon={Bookmark} label="Research Citation">
            <div className="space-y-3">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 font-mono text-[12px] text-zinc-500">
                EduThreat-CTI. &quot;{name} Cyber Incident ({formatDate(incident.incident_date)}).&quot;
                Incident ID: {incident.incident_id}. Retrieved {new Date().toLocaleDateString()}.
              </div>
              <div className="flex gap-2">
                <button onClick={() => copy(`EduThreat-CTI. "${name} Cyber Incident (${formatDate(incident.incident_date)})." Incident ID: ${incident.incident_id}. Retrieved ${new Date().toLocaleDateString()}.`, "citation")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors">
                  {copied === "citation" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy Citation
                </button>
                <button onClick={() => copy(JSON.stringify(incident, null, 2), "json")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors">
                  {copied === "json" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy JSON
                </button>
              </div>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function QuickStat({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#0a0a14] border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 transition-colors">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-zinc-600" />
        <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium">{label}</span>
      </div>
      <p className="text-[13px] font-semibold text-zinc-200 capitalize truncate">{value}</p>
      {sub && <p className="text-[11px] text-zinc-600 truncate">{sub}</p>}
    </div>
  );
}

function Section({ icon: Icon, label, badge, count, headerRight, children }: {
  icon: React.ElementType; label: string; badge?: string; count?: number;
  headerRight?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0a0a14] border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-cyan-500" />
          <h2 className="text-[13px] font-semibold text-zinc-200">{label}</h2>
          {badge && <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{badge}</span>}
          {count !== undefined && <span className="text-[10px] text-zinc-600 font-mono ml-1">{count}</span>}
        </div>
        {headerRight}
      </div>
      {children}
    </div>
  );
}

function DF({ label, value }: { label: string; value: string | null | undefined }) {
  const empty = !value || value === "N/A" || value === "Unknown";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-0.5">{label}</p>
      <p className={cn("text-[13px] font-medium capitalize", empty ? "text-zinc-700" : "text-zinc-300")}>
        {value || "—"}
      </p>
    </div>
  );
}

function getUrlDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

function getDisplayUrl(sourceUrl: {
  resolved_url?: string;
  url?: string;
}): string | null {
  return sourceUrl.resolved_url || sourceUrl.url || null;
}

function dedupeSourceUrls<T extends { resolved_url?: string; url?: string }>(sourceUrls: T[]): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];
  for (const sourceUrl of sourceUrls) {
    const displayUrl = getDisplayUrl(sourceUrl);
    if (!displayUrl || seen.has(displayUrl)) continue;
    seen.add(displayUrl);
    deduped.push(sourceUrl);
  }
  return deduped;
}

function humanizeDisclosureKey(value?: string | null): string | null {
  if (!value) return null;
  return value.replace(/_/g, " ");
}

function humanizeScoreBreakdownKey(value: string): string {
  const labels: Record<string, string> = {
    source_rank: "Source Trust",
    structured_field_coverage: "Field Coverage",
    summary_richness: "Summary Depth",
    timeline_depth: "Timeline Depth",
    named_victim_bonus: "Named Victim",
    incident_date_bonus: "Incident Date",
    actor_or_family_bonus: "Actor/Family",
    country_bonus: "Country",
    identity_title_alignment_bonus: "Title Match",
    identity_title_alignment_penalty: "Title Mismatch",
    enrichment_confidence_bonus: "LLM Confidence",
  };
  return labels[value] || humanizeDisclosureKey(value) || value;
}

function ImpactCard({ icon: Icon, title, accent, fields }: {
  icon: React.ElementType; title: string; accent: string;
  fields: { label: string; value: string | null | undefined; alert?: boolean; bold?: boolean }[];
}) {
  const accentMap: Record<string, string> = { cyan: "text-cyan-400", violet: "text-violet-400", orange: "text-orange-400", emerald: "text-emerald-400", red: "text-red-400", sky: "text-sky-400" };
  const borderMap: Record<string, string> = { cyan: "border-cyan-500/15", violet: "border-violet-500/15", orange: "border-orange-500/15", emerald: "border-emerald-500/15", red: "border-red-500/15", sky: "border-sky-500/15" };
  const c = accentMap[accent] ?? "text-zinc-400";
  const b = borderMap[accent] ?? "border-zinc-800";
  return (
    <div className={cn("bg-zinc-900/30 border rounded-lg p-4", b)}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("w-4 h-4", c)} />
        <h3 className="text-[12px] font-semibold text-zinc-300">{title}</h3>
      </div>
      <div className="space-y-1.5">
        {fields.filter(f => f.value).map((f, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-zinc-600">{f.label}</span>
            <span className={cn("text-[12px] font-mono", f.alert ? "text-red-400" : f.bold ? c : "text-zinc-300")}>{f.value}</span>
          </div>
        ))}
        {fields.every(f => !f.value) && <p className="text-[11px] text-zinc-700 italic">No data</p>}
      </div>
    </div>
  );
}

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-20 text-zinc-700">
      <div className="text-center space-y-2">
        <FileText className="w-8 h-8 mx-auto" />
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto animate-pulse">
      <div className="h-5 w-32 bg-zinc-900 rounded" />
      <div className="h-48 bg-zinc-900 border border-zinc-800 rounded-xl" />
      <div className="grid grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-zinc-900 border border-zinc-800 rounded-lg" />)}
      </div>
      <div className="h-10 bg-zinc-900 border-b border-zinc-800" />
      <div className="h-64 bg-zinc-900 border border-zinc-800 rounded-xl" />
    </div>
  );
}
