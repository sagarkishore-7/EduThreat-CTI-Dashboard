"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getCountryAnalytics, getStats } from "@/lib/api";
import { getCountryFlag, formatNumber, cn } from "@/lib/utils";
import { Globe2, MapPin } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

const WorldHeatmap = dynamic(
  () => import("@/components/charts/WorldHeatmap").then((m) => m.WorldHeatmap),
  { ssr: false }
);

export default function MapPage() {
  const router = useRouter();

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
  });

  const { data: countryData, isLoading } = useQuery({
    queryKey: ["countries-full"],
    queryFn: () => getCountryAnalytics(50),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-[100px] bg-zinc-900 border border-zinc-800 rounded-lg" />
        <div className="h-[500px] bg-zinc-900 border border-zinc-800 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <div key={i} className="h-[300px] bg-zinc-900 border border-zinc-800 rounded-lg" />)}
        </div>
      </div>
    );
  }

  // Group countries by region
  const regionMap: Record<string, string[]> = {
    "North America": ["United States", "Canada", "Mexico"],
    "Europe": ["United Kingdom", "Germany", "France", "Italy", "Spain", "Netherlands", "Belgium", "Austria", "Switzerland", "Poland", "Sweden", "Norway", "Denmark", "Finland", "Ireland", "Portugal", "Greece", "Czech Republic", "Hungary", "Romania", "Bulgaria", "Croatia", "Slovakia", "Slovenia", "Lithuania", "Latvia", "Estonia", "Luxembourg", "Malta", "Cyprus", "Iceland"],
    "Asia Pacific": ["Australia", "New Zealand", "Japan", "South Korea", "Singapore", "Hong Kong", "Taiwan", "India", "Philippines", "Malaysia", "Thailand", "Indonesia", "Vietnam", "China"],
    "Middle East & Africa": ["Israel", "United Arab Emirates", "Saudi Arabia", "South Africa", "Egypt", "Nigeria", "Kenya"],
    "Latin America": ["Brazil", "Argentina", "Chile", "Colombia", "Peru"],
  };

  const countryToRegion: Record<string, string> = {};
  Object.entries(regionMap).forEach(([region, countries]) => {
    countries.forEach((country) => {
      countryToRegion[country] = region;
    });
  });

  type CountryItem = { category: string; count: number; flag_emoji?: string };
  const groupedByRegion: Record<string, CountryItem[]> = {};
  countryData?.data?.forEach((country) => {
    const region = countryToRegion[country.category] || "Other";
    if (!groupedByRegion[region]) {
      groupedByRegion[region] = [];
    }
    groupedByRegion[region].push(country);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={Globe2}
        label="Global Threat Map"
        title="Global Threat Map"
        description={`Geographic distribution of cyber incidents across ${stats?.countries_affected || 0} countries targeting educational institutions`}
      >
        {stats && (
          <div className="flex items-center gap-8">
            <div>
              <span className="text-2xl font-bold font-mono text-zinc-100">{stats.countries_affected}</span>
              <span className="text-zinc-500 ml-2 text-sm">countries affected</span>
            </div>
            <div className="w-px h-6 bg-zinc-800" />
            <div>
              <span className="text-2xl font-bold font-mono text-zinc-100">{stats.education_incidents.toLocaleString()}</span>
              <span className="text-zinc-500 ml-2 text-sm">total incidents</span>
            </div>
          </div>
        )}
      </PageHeader>

      {/* Interactive World Map */}
      {countryData?.data && (
        <WorldHeatmap
          data={countryData.data}
          onCountryClick={(country) => {
            router.push(`/incidents?country=${encodeURIComponent(country)}`);
          }}
        />
      )}

      {/* Region Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(groupedByRegion)
          .sort((a, b) => {
            const totalA = a[1].reduce((sum, c) => sum + c.count, 0);
            const totalB = b[1].reduce((sum, c) => sum + c.count, 0);
            return totalB - totalA;
          })
          .map(([region, countries], regionIndex) => {
            const totalIncidents = countries.reduce((sum, c) => sum + c.count, 0);

            return (
              <div
                key={region}
                className="bg-[#0d0d1a] border border-zinc-800 rounded-xl p-5 animate-slide-up"
                style={{ animationDelay: `${regionIndex * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold flex items-center gap-2 text-zinc-100">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    {region}
                  </h2>
                  <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    {formatNumber(totalIncidents)}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {countries.slice(0, 8).map((country) => (
                    <Link
                      key={country.category}
                      href={`/incidents?country=${country.category}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/50 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{getCountryFlag(country.category, country.flag_emoji)}</span>
                        <span className="text-[13px] text-zinc-300 group-hover:text-zinc-100 transition-colors">{country.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-mono font-medium text-zinc-400">{country.count}</span>
                        <div className="w-14 h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-500/60 rounded-full"
                            style={{ width: `${(country.count / countries[0].count) * 100}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  ))}
                  {countries.length > 8 && (
                    <p className="text-xs text-zinc-600 text-center pt-2">
                      +{countries.length - 8} more countries
                    </p>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Full Country List */}
      <div className="bg-[#0d0d1a] border border-zinc-800 rounded-xl p-6">
        <p className="section-label mb-4">All Countries</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {countryData?.data.map((country, index) => (
            <Link
              key={country.category}
              href={`/incidents?country=${country.category}`}
              className="flex items-center gap-2 p-3 bg-zinc-900/40 rounded-lg border border-zinc-800 hover:border-cyan-500/30 hover:bg-zinc-800/50 transition-all animate-slide-up group"
              style={{ animationDelay: `${index * 20}ms` }}
            >
              <span className="text-xl">{getCountryFlag(country.category, country.flag_emoji)}</span>
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-medium block truncate text-zinc-300 group-hover:text-zinc-100 transition-colors">{country.category}</span>
                <span className="text-xs text-zinc-600 font-mono">{country.count}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
