import type { CampaignSummary } from "@/lib/api";

export interface CampaignFamily {
  familyId: string;
  primary: CampaignSummary;
  related: CampaignSummary[]; // non-primary fragments of the same real campaign
}

/**
 * Group campaigns into related families so that fragments of one real campaign
 * (same actor/year, split across runs into separate campaign_ids) collapse into
 * a single entry instead of duplicate rows/nodes (e.g. several "MOVEit"
 * campaigns). Falls back to one-campaign-per-family when `metadata.family_id`
 * is absent, so older data is unchanged. The primary is the family-flagged
 * primary, else the largest membership.
 */
export function buildFamilies(campaigns: CampaignSummary[]): CampaignFamily[] {
  const groups = new Map<string, CampaignSummary[]>();
  for (const c of campaigns) {
    const fid = (c.metadata?.["family_id"] as string | undefined) || c.campaign_id;
    (groups.get(fid) ?? groups.set(fid, []).get(fid)!).push(c);
  }
  const families: CampaignFamily[] = [];
  for (const [familyId, members] of Array.from(groups.entries())) {
    const sorted = [...members].sort((a, b) => b.member_count - a.member_count);
    const primary =
      members.find((m) => m.metadata?.["is_primary_in_family"] === true) ?? sorted[0];
    const related = sorted.filter((m) => m.campaign_id !== primary.campaign_id);
    families.push({ familyId, primary, related });
  }
  return families.sort((a, b) => b.primary.member_count - a.primary.member_count);
}
