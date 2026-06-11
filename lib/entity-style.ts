// Shared entity palette + lucide icon, used by every graph renderer (AttackChainFlow,
// FlowSankey, and the legacy KnowledgeGraph). One source of truth so colours and icons
// stay consistent. Each type carries a DISTINCT hue spread around the wheel + a crisp
// lucide icon (replacing the old OS-dependent emoji that rendered fuzzily on canvas).

import {
  Skull,
  Lock,
  Globe,
  Target,
  Building2,
  Bug,
  Server,
  Settings2,
  Zap,
  GraduationCap,
  Circle,
  type LucideIcon,
} from "lucide-react";

export interface EntityStyle {
  color: string;
  label: string;
  Icon: LucideIcon;
}

export const ENTITY_STYLE: Record<string, EntityStyle> = {
  actor: { color: "#ff4757", label: "Threat actor", Icon: Skull }, // red
  family: { color: "#818cf8", label: "Ransomware family", Icon: Lock }, // indigo
  country: { color: "#22d3ee", label: "Country", Icon: Globe }, // cyan
  campaign: { color: "#f472b6", label: "Campaign", Icon: Target }, // pink
  vendor: { color: "#c2703d", label: "Vendor", Icon: Building2 }, // bronze
  cve: { color: "#fbbf24", label: "CVE", Icon: Bug }, // gold
  platform: { color: "#4dbcff", label: "Platform", Icon: Server }, // blue
  technique: { color: "#a855f7", label: "MITRE technique", Icon: Settings2 }, // violet
  incident: { color: "#8189a0", label: "Incident", Icon: Zap }, // slate
  institution: { color: "#34d399", label: "Institution", Icon: GraduationCap }, // emerald
};
// Legacy node type from older graph payloads — render as a CVE.
ENTITY_STYLE.cve_or_product = ENTITY_STYLE.cve;

// Per-relation edge tint, shared across the attack-chain stepper and the Sankey.
export const RELATION_COLOR: Record<string, string> = {
  // campaign attack chain
  has_vuln: "#fbbf24", // platform → CVE (gold)
  exploited_by: "#ff6b6b", // CVE → actor (red — the exploitation step)
  targeted_by: "#4dbcff", // platform → actor, no CVE (blue)
  affected: "#34d399", // asset → institution (emerald)
  // investigations / intel-graph
  operates_in: "#22d3ee", // country → actor (cyan)
  uses: "#818cf8", // actor → family (indigo)
  runs: "#f472b6", // actor → campaign (pink)
  uses_cve: "#fbbf24", // campaign → CVE (gold)
};

export function entityColor(type: string, explicit?: string): string {
  return explicit || ENTITY_STYLE[type]?.color || "#8189a0";
}

export function entityIcon(type: string): LucideIcon {
  return ENTITY_STYLE[type]?.Icon ?? Circle;
}

export function entityLabel(type: string): string {
  return ENTITY_STYLE[type]?.label ?? type;
}

export function relationColor(relation: string | undefined, sourceType?: string): string {
  return (relation && RELATION_COLOR[relation]) || entityColor(sourceType ?? "");
}
