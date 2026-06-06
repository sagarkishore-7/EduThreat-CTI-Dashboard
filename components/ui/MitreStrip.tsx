import { formatNumber } from "@/lib/utils";

export interface MitreTacticDatum {
  tactic: string;
  count: number;
  techniqueCount?: number;
}

/**
 * Canonical ATT&CK enterprise tactic order so the strip always reads in
 * kill-chain sequence even when the API returns tactics ranked by volume.
 */
const TACTIC_ORDER = [
  "Reconnaissance",
  "Resource Development",
  "Initial Access",
  "Execution",
  "Persistence",
  "Privilege Escalation",
  "Defense Evasion",
  "Credential Access",
  "Discovery",
  "Lateral Movement",
  "Collection",
  "Command and Control",
  "Exfiltration",
  "Impact",
];

const SHORT: Record<string, string> = {
  "resource development": "Resource Dev",
  "privilege escalation": "Priv Esc",
  "credential access": "Cred Access",
  "lateral movement": "Lateral Move",
  "command and control": "C2",
};

function orderRank(name: string): number {
  const idx = TACTIC_ORDER.findIndex((t) => t.toLowerCase() === name.toLowerCase());
  return idx === -1 ? TACTIC_ORDER.length + 1 : idx;
}

function shortLabel(name: string): string {
  return SHORT[name.toLowerCase()] || name;
}

/**
 * MITRE ATT&CK observed-tactics heat strip. Each column's background intensity
 * and indicator bars scale with observation frequency.
 */
export function MitreStrip({ tactics }: { tactics: MitreTacticDatum[] }) {
  if (!tactics || tactics.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800/70 bg-zinc-900/30 px-4 py-8 text-center text-sm text-zinc-500">
        No MITRE ATT&CK techniques have been mapped in the current open set yet.
      </div>
    );
  }
  const ordered = [...tactics].sort((a, b) => orderRank(a.tactic) - orderRank(b.tactic));
  const max = Math.max(...ordered.map((t) => t.count), 1);

  return (
    <div className="mitre-strip" style={{ ["--cols" as string]: String(ordered.length) }}>
      {ordered.map((t) => {
        const intensity = Math.round((t.count / max) * 35);
        const hotCount = Math.max(1, Math.round((t.count / max) * 5));
        return (
          <div
            key={t.tactic}
            className="mt-col"
            style={{ ["--i" as string]: String(intensity) }}
            title={`${t.tactic}: ${formatNumber(t.count)} observations${t.techniqueCount ? ` · ${t.techniqueCount} techniques` : ""}`}
          >
            <div className="mt-lbl">{shortLabel(t.tactic)}</div>
            <div className="mt-cnt">{formatNumber(t.count)}</div>
            <div className="mt-bars">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={i < hotCount ? "hot" : ""} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
