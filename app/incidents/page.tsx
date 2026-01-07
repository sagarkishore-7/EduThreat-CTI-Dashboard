"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getIncidents, getFilters } from "@/lib/api";
import {
  formatDate,
  formatAttackCategory,
  getAttackTypeColor,
  getStatusColor,
  getCountryFlag,
  cn,
} from "@/lib/utils";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";

export default function IncidentsPage() {
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<{
    country?: string;
    attack_category?: string;
    ransomware_family?: string;
    year?: number;
    enriched_only?: boolean;
  }>({});
  const [showFilters, setShowFilters] = useState(false);

  const { data: filterOptions } = useQuery({
    queryKey: ["filters"],
    queryFn: getFilters,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["incidents", page, perPage, search, filters],
    queryFn: () =>
      getIncidents({
        page,
        per_page: perPage,
        search: search || undefined,
        ...filters,
      }),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleFilterChange = (key: string, value: string | number | boolean | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearch("");
    setPage(1);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to Load Incidents</h2>
          <p className="text-muted-foreground">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search and Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search incidents by name, title, or threat actor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </form>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              showFilters
                ? "bg-primary text-primary-foreground"
                : "bg-secondary hover:bg-secondary/80"
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
            {Object.values(filters).filter(Boolean).length > 0 && (
              <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs">
                {Object.values(filters).filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && filterOptions && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {/* Country Filter */}
              <select
                value={filters.country || ""}
                onChange={(e) => handleFilterChange("country", e.target.value)}
                className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              >
                <option value="">All Countries</option>
                {filterOptions.countries.map((c) => (
                  <option key={c} value={c}>
                    {getCountryFlag(c)} {c}
                  </option>
                ))}
              </select>

              {/* Attack Category Filter */}
              <select
                value={filters.attack_category || ""}
                onChange={(e) => handleFilterChange("attack_category", e.target.value)}
                className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              >
                <option value="">All Attack Types</option>
                {filterOptions.attack_categories.map((c) => (
                  <option key={c} value={c}>
                    {formatAttackCategory(c)}
                  </option>
                ))}
              </select>

              {/* Ransomware Filter */}
              <select
                value={filters.ransomware_family || ""}
                onChange={(e) => handleFilterChange("ransomware_family", e.target.value)}
                className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              >
                <option value="">All Ransomware</option>
                {filterOptions.ransomware_families.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              {/* Year Filter */}
              <select
                value={filters.year || ""}
                onChange={(e) =>
                  handleFilterChange("year", e.target.value ? parseInt(e.target.value) : undefined)
                }
                className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              >
                <option value="">All Years</option>
                {filterOptions.years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              {/* Enriched Only */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.enriched_only || false}
                  onChange={(e) => handleFilterChange("enriched_only", e.target.checked)}
                  className="rounded bg-secondary border-border"
                />
                Enriched Only
              </label>

              {/* Clear Filters */}
              <button
                onClick={clearFilters}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Incidents Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                  Institution
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                  Date
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                  Attack Type
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                  Threat Actor
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                  Enriched
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="h-6 skeleton rounded" />
                    </td>
                  </tr>
                ))
              ) : data?.incidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No incidents found matching your criteria.
                  </td>
                </tr>
              ) : (
                data?.incidents.map((incident) => (
                  <tr
                    key={incident.incident_id}
                    className="border-b border-border hover:bg-secondary/30 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">
                          {getCountryFlag(incident.country)}
                        </span>
                        <div>
                          <Link
                            href={`/incidents/${incident.incident_id}`}
                            className="font-medium hover:text-primary transition-colors"
                          >
                            {incident.university_name}
                          </Link>
                          {incident.title && (
                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                              {incident.title}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">
                      {formatDate(incident.incident_date)}
                    </td>
                    <td className="px-4 py-4">
                      {(incident.attack_category || incident.attack_type_hint) && (
                        <span
                          className={cn(
                            "tag",
                            getAttackTypeColor(
                              incident.attack_category || incident.attack_type_hint
                            )
                          )}
                        >
                          {formatAttackCategory(
                            incident.attack_category || incident.attack_type_hint
                          )}
                        </span>
                      )}
                      {incident.ransomware_family && (
                        <span className="tag ml-1 bg-red-500/20 text-red-400 border-red-500/30">
                          {incident.ransomware_family}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {incident.threat_actor_name && (
                        <span className="tag bg-purple-500/20 text-purple-400 border-purple-500/30">
                          {incident.threat_actor_name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("tag", getStatusColor(incident.status))}>
                        {incident.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {incident.llm_enriched ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-muted-foreground" />
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/incidents/${incident.incident_id}`}
                        className="p-2 hover:bg-secondary rounded-lg transition-colors inline-flex"
                      >
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pagination.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * perPage + 1} to{" "}
              {Math.min(page * perPage, data.pagination.total)} of{" "}
              {data.pagination.total} incidents
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!data.pagination.has_prev}
                className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm">
                Page {page} of {data.pagination.total_pages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!data.pagination.has_next}
                className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

