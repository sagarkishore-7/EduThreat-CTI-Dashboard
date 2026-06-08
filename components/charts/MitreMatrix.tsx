"use client";

import { useRouter } from "next/navigation";
import { formatNumber } from "@/lib/utils";
import type { MitreAnalyticsResponse } from "@/lib/api";

// Canonical ATT&CK enterprise tactic order (kill-chain sequence).
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

function orderRank(t: string): number {
  const i = TACTIC_ORDER.findIndex((x) => x.toLowerCase() === t.toLowerCase());
  return i === -1 ? 999 : i;
}

/**
 * MITRE ATT&CK matrix: one column per observed tactic (kill-chain order), the
 * top techniques stacked as cells beneath. Cell colour intensity encodes
 * incident frequency. Horizontally scrollable on small screens so the matrix
 * stays readable instead of cramming every tactic into the viewport width.
 */
export function MitreMatrix({ data }: { data: MitreAnalyticsResponse }) {
  const router = useRouter();
  const columns = [...(data.top_techniques_by_tactic ?? [])].sort(
    (a, b) => orderRank(a.tactic) - orderRank(b.tactic),
  );

  const maxCount = Math.max(
    1,
    ...columns.flatMap((c) => c.techniques.map((t) => t.count)),
  );

  if (columns.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800/70 bg-zinc-900/30 px-4 py-8 text-center text-sm text-zinc-500">
        No MITRE ATT&CK techniques have been mapped in the current open set yet.
      </div>
    );
  }

  const cellColor = (count: number) => {
    const intensity = Math.pow(count / maxCount, 0.5);
    return `color-mix(in srgb, var(--brand) ${Math.round(12 + intensity * 78)}%, #0a0d16)`;
  };

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max gap-1.5">
        {columns.map((col) => (
          <div key={col.tactic} className="flex w-[124px] shrink-0 flex-col gap-1">
            <div className="sticky top-0 rounded-t-md border-b border-zinc-800/70 bg-[#0c0f18] px-2 py-1.5">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.05em] text-zinc-400" title={col.tactic}>
                {col.tactic}
              </p>
              <p className="font-mono text-[9px] text-zinc-600">{col.techniques.length} techniques</p>
            </div>
            {col.techniques.map((tech) => (
              <button
                key={tech.technique_id}
                type="button"
                title={`${tech.technique_id} · ${tech.technique_name} — ${formatNumber(tech.count)} incidents`}
                onClick={() =>
                  router.push(`/incidents?search=${encodeURIComponent(tech.technique_name)}`)
                }
                className="group rounded-md border border-zinc-800/50 px-2 py-1.5 text-left transition-colors hover:border-emerald-400/60"
                style={{ background: cellColor(tech.count) }}
              >
                <p className="truncate text-[10.5px] font-medium text-zinc-100" title={tech.technique_name}>
                  {tech.technique_name}
                </p>
                <div className="mt-0.5 flex items-center justify-between">
                  <span className="font-mono text-[9px] text-zinc-400">{tech.technique_id}</span>
                  <span className="font-mono text-[10px] font-bold text-emerald-200">{formatNumber(tech.count)}</span>
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
