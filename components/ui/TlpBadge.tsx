import { cn } from "@/lib/utils";

export type TlpLevel = "red" | "amber" | "amber-strict" | "green" | "clear";

const LABEL: Record<TlpLevel, string> = {
  red: "RED",
  amber: "AMBER",
  "amber-strict": "AMBER+STRICT",
  green: "GREEN",
  clear: "CLEAR",
};

/**
 * Traffic Light Protocol marker (TLP 2.0). Renders as `TLP:<LEVEL>` using the
 * official TLP colors. Defaults to a sensible level when none is supplied.
 */
export function TlpBadge({
  level = "clear",
  className,
}: {
  level?: TlpLevel | string | null;
  className?: string;
}) {
  const lvl = (level || "clear").toString().toLowerCase().replace(/[_\s]+/g, "-") as TlpLevel;
  const safe: TlpLevel = (["red", "amber", "amber-strict", "green", "clear"] as const).includes(lvl)
    ? lvl
    : "clear";
  return <span className={cn("tlp", `tlp-${safe}`, className)}>{LABEL[safe]}</span>;
}

/**
 * Derive a default TLP level for an incident from its sensitivity signals.
 * Confirmed/active critical activity → AMBER; named-actor leak posts → RED;
 * routine public disclosures → GREEN; aggregated/derived → CLEAR.
 */
export function deriveTlp(input: {
  severity?: string | null;
  attackCategory?: string | null;
  hasLeakSite?: boolean | null;
  publicDisclosure?: boolean | null;
}): TlpLevel {
  const sev = (input.severity || "").toLowerCase();
  const cat = (input.attackCategory || "").toLowerCase();
  if (input.hasLeakSite || cat.includes("double_extortion")) return "red";
  if (sev === "critical") return "amber";
  if (cat.includes("ransomware")) return "amber";
  if (input.publicDisclosure) return "green";
  return "green";
}
