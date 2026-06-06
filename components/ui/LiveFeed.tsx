import Link from "next/link";
import type { RecentIncident } from "@/lib/api";
import { formatAttackCategory, getCountryFlag, truncate } from "@/lib/utils";
import { SeverityPill, severityFromCategory } from "./SeverityPill";
import { TlpBadge, deriveTlp } from "./TlpBadge";

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/**
 * Live event stream — one row per recent canonical incident with a severity
 * pill, target institution, summary, attributed actor, category, and a TLP
 * marker. Rows link through to the incident case file.
 */
export function LiveFeed({ incidents }: { incidents: RecentIncident[] }) {
  return (
    <div className="flex-1 overflow-y-auto">
      {incidents.map((e, idx) => {
        const sev = severityFromCategory(e.attack_category);
        const tlp = deriveTlp({
          attackCategory: e.attack_category,
          severity: sev,
          hasLeakSite: Boolean(e.ransomware_family),
        });
        const summary = e.enriched_summary || e.title || "Incident under triage.";
        return (
          <Link
            key={e.incident_id}
            href={`/incidents/${e.incident_id}`}
            className={
              "block border-b border-zinc-800/70 px-3.5 py-2.5 transition-colors hover:bg-[#161a26] " +
              (idx === 0 ? "bg-gradient-to-r from-emerald-400/10 to-transparent" : "")
            }
          >
            <div className="mb-1 flex items-center gap-2">
              <SeverityPill severity={sev} />
              <span className="text-[13px] leading-none">{getCountryFlag(e.country)}</span>
              <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-zinc-100">
                {e.institution_name}
              </span>
              <span className="shrink-0 font-mono text-[10px] text-zinc-500">{timeAgo(e.incident_date)}</span>
            </div>
            <div className="mb-1.5 truncate text-[11px] leading-snug text-zinc-400">{truncate(summary, 110)}</div>
            <div className="flex flex-wrap items-center gap-1">
              {e.threat_actor_name && <span className="pill pill-pulse">{e.threat_actor_name}</span>}
              {e.ransomware_family && <span className="pill pill-threat">{e.ransomware_family}</span>}
              {e.attack_category && (
                <span className="pill pill-mute normal-case tracking-normal">
                  {formatAttackCategory(e.attack_category)}
                </span>
              )}
              <TlpBadge level={tlp} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
