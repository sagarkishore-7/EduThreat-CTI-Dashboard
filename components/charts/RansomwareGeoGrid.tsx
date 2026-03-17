"use client";

import { EmptyState } from "@/components/EmptyState";

interface CountryCount {
  country: string;
  count: number;
}

interface FamilyGeoData {
  family: string;
  countries: CountryCount[];
}

interface RansomwareGeoGridProps {
  data: FamilyGeoData[];
}

function FamilyGeoCard({ family, countries }: FamilyGeoData) {
  const maxCount = countries.length > 0 ? Math.max(...countries.map((c) => c.count)) : 1;
  const topCountries = countries.slice(0, 6);

  return (
    <div className="rounded-lg border border-border bg-zinc-900/50 p-4 hover:border-zinc-600 transition-colors">
      <h4 className="text-sm font-semibold mb-3 capitalize truncate" title={family}>
        {family.replace(/_/g, " ")}
      </h4>
      {topCountries.length === 0 ? (
        <p className="text-xs text-muted-foreground">No geographic data</p>
      ) : (
        <div className="space-y-2">
          {topCountries.map((c) => {
            const pct = (c.count / maxCount) * 100;
            return (
              <div key={c.country} className="group">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-zinc-300 truncate max-w-[120px]" title={c.country}>
                    {c.country}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums ml-2">
                    {c.count}
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-red-500 transition-all duration-300 group-hover:brightness-125"
                    style={{ width: `${pct}%`, opacity: 0.4 + (pct / 100) * 0.6 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function RansomwareGeoGrid({ data }: RansomwareGeoGridProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-4">Geographic Targeting by Ransomware Family</h3>
        <EmptyState message="No geographic targeting data available" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold mb-4">Geographic Targeting by Ransomware Family</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {data.map((entry) => (
          <FamilyGeoCard key={entry.family} {...entry} />
        ))}
      </div>
    </div>
  );
}
