import { cn } from "@/lib/utils";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

const MAP: Record<Severity, { cls: string; label: string }> = {
  critical: { cls: "pill-threat", label: "CRIT" },
  high: { cls: "pill-warn", label: "HIGH" },
  medium: { cls: "pill-watch", label: "MED" },
  low: { cls: "pill-info", label: "LOW" },
  info: { cls: "pill-clear", label: "INFO" },
};

export function normalizeSeverity(value?: string | null): Severity {
  const v = (value || "").toLowerCase();
  if (v.startsWith("crit")) return "critical";
  if (v.startsWith("high")) return "high";
  if (v.startsWith("med")) return "medium";
  if (v.startsWith("low")) return "low";
  return "info";
}

/**
 * Infer a severity band from attack category when an explicit severity is
 * missing — ransomware/double-extortion read critical, breaches high, etc.
 */
export function severityFromCategory(category?: string | null): Severity {
  const c = (category || "").toLowerCase();
  if (c.includes("double_extortion") || c.includes("ransomware_encryption")) return "critical";
  if (c.includes("ransomware")) return "high";
  if (c.includes("breach")) return "high";
  if (c.includes("unauthorized") || c.includes("malware")) return "medium";
  if (c.includes("exposure") || c.includes("misconfig")) return "medium";
  return "low";
}

export function SeverityPill({
  severity,
  className,
}: {
  severity?: string | null;
  className?: string;
}) {
  const sev = normalizeSeverity(severity);
  const { cls, label } = MAP[sev];
  return <span className={cn("pill", cls, className)}>{label}</span>;
}
