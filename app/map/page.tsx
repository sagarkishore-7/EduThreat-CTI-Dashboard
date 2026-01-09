"use client";

import { useQuery } from "@tanstack/react-query";
import { getCountryAnalytics, getStats } from "@/lib/api";
import { getCountryFlag, formatNumber, cn } from "@/lib/utils";
import { Globe2, AlertTriangle, MapPin } from "lucide-react";
import Link from "next/link";

export default function MapPage() {
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
      <div className="space-y-6">
        <div className="h-32 skeleton rounded-xl" />
        <div className="h-[500px] skeleton rounded-xl" />
      </div>
    );
  }

  // Group countries by region (using full country names)
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
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <Globe2 className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">Global Threat Map</h1>
        </div>
        <p className="text-muted-foreground">
          Geographic distribution of cyber incidents targeting educational institutions
        </p>
        {stats && (
          <div className="mt-4 flex items-center gap-6">
            <div>
              <span className="text-3xl font-bold">{stats.countries_affected}</span>
              <span className="text-muted-foreground ml-2">countries affected</span>
            </div>
            <div>
              <span className="text-3xl font-bold">{stats.total_incidents}</span>
              <span className="text-muted-foreground ml-2">total incidents</span>
            </div>
          </div>
        )}
      </div>

      {/* Region Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                className={cn(
                  "bg-card border border-border rounded-xl p-5",
                  "animate-slide-up"
                )}
                style={{ animationDelay: `${regionIndex * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    {region}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {formatNumber(totalIncidents)} incidents
                  </span>
                </div>
                <div className="space-y-2">
                  {countries.slice(0, 8).map((country, index) => (
                    <Link
                      key={country.category}
                      href={`/incidents?country=${country.category}`}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg",
                        "hover:bg-secondary transition-colors"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getCountryFlag(country.category, country.flag_emoji)}</span>
                        <span className="text-sm">{country.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{country.count}</span>
                        <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(country.count / countries[0].count) * 100}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  ))}
                  {countries.length > 8 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      +{countries.length - 8} more countries
                    </p>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Full Country List */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">All Countries</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {countryData?.data.map((country, index) => (
            <Link
              key={country.category}
              href={`/incidents?country=${country.category}`}
              className={cn(
                "flex items-center gap-2 p-3 bg-secondary/50 rounded-lg border border-border",
                "hover:border-primary/30 transition-all",
                "animate-slide-up"
              )}
              style={{ animationDelay: `${index * 20}ms` }}
            >
              <span className="text-xl">{getCountryFlag(country.category, country.flag_emoji)}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium block truncate">{country.category}</span>
                <span className="text-xs text-muted-foreground">{country.count} incidents</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

