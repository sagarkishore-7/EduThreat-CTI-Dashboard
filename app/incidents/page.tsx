"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getFilters, getIncidents } from "@/lib/api";
import { TlpBadge, deriveTlp } from "@/components/ui/TlpBadge";
import { SeverityPill, severityFromCategory } from "@/components/ui/SeverityPill";
import { TableSkeleton } from "@/components/ui/Skeleton";
import {
  cn,
  formatAttackCategory,
  formatDate,
  getAttackTypeColor,
  getCountryFlag,
} from "@/lib/utils";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Grid2x2,
  List,
  Map as MapIcon,
  Search,
  X,
} from "lucide-react";

type SortField = "incident_date" | "institution_name" | "country" | "attack_category";
type SortOrder = "asc" | "desc";
type ViewMode = "list" | "cards";

export default function IncidentsPage() {
  return (
    <Suspense fallback={<TableSkeleton header={false} />}>
      <IncidentsContent />
    </Suspense>
  );
}

function IncidentsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = parseInt(searchParams.get("page") || "1", 10);
  const perPage = parseInt(searchParams.get("per_page") || "25", 10);
  const search = searchParams.get("search") || "";
  const sortBy = (searchParams.get("sort_by") || "incident_date") as SortField;
  const sortOrder = (searchParams.get("sort_order") || "desc") as SortOrder;
  const country = searchParams.get("country") || "";
  const attackCategory = searchParams.get("attack_category") || "";
  const ransomware = searchParams.get("ransomware_family") || "";
  const year = searchParams.get("year") || "";
  const view = (searchParams.get("view") || "list") as ViewMode;

  const [localSearch, setLocalSearch] = useState(search);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());

  useEffect(() => setLocalSearch(search), [search]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("visitedIncidents");
      if (raw) setVisitedIds(new Set(JSON.parse(raw)));
    } catch {
      // ignore local storage errors
    }
  }, []);

  const push = useCallback(
    (updates: Record<string, string | number | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === "") params.delete(key);
        else params.set(key, String(value));
      });
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const activeFilters = [
    country ? { key: "country", label: country } : null,
    attackCategory ? { key: "attack_category", label: formatAttackCategory(attackCategory) } : null,
    ransomware ? { key: "ransomware_family", label: ransomware } : null,
    year ? { key: "year", label: year } : null,
  ].filter(Boolean) as Array<{ key: string; label: string }>;

  const filtersQuery = useQuery({
    queryKey: ["filters"],
    queryFn: getFilters,
  });

  const incidentsQuery = useQuery({
    queryKey: ["incidents", page, perPage, search, sortBy, sortOrder, country, attackCategory, ransomware, year],
    queryFn: () =>
      getIncidents({
        page,
        per_page: perPage,
        // Published dataset = open + education-related canonicals. Filtering here
        // keeps the "Filtered Results" total in lock-step with the homepage
        // headline and the admin canonical count (all use the same definition).
        is_education_related: true,
        search: search || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        country: country || undefined,
        attack_category: attackCategory || undefined,
        ransomware_family: ransomware || undefined,
        year: year ? parseInt(year, 10) : undefined,
      }),
    placeholderData: (previous) => previous,
  });

  const submitSearch = () => push({ search: localSearch || undefined, page: 1 });

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      push({ sort_order: sortOrder === "desc" ? "asc" : "desc", page: 1 });
      return;
    }
    push({ sort_by: field, sort_order: "desc", page: 1 });
  };

  const clearFilters = () =>
    push({
      search: undefined,
      country: undefined,
      attack_category: undefined,
      ransomware_family: undefined,
      year: undefined,
      page: 1,
    });

  const total = incidentsQuery.data?.pagination.total || 0;
  const incidents = incidentsQuery.data?.incidents || [];
  const topCountries = useMemo(() => {
    const counts = new Map<string, number>();
    incidents.forEach((incident) => {
      if (!incident.country) return;
      counts.set(incident.country, (counts.get(incident.country) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [incidents]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="ops-shell overflow-hidden">
        <div className="border-b border-zinc-800/80 px-5 py-5 md:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="section-label mb-2">Incident Register</p>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Canonical incident workspace</h1>
              <p className="mt-2 text-sm text-zinc-500">
                Searchable education-sector casework with stable URLs, analyst filters, and incident-centric canonical detail.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[540px]">
              <SummaryBox label="Filtered Results" value={total.toLocaleString()} detail="Canonical incidents matching the current view" />
              <SummaryBox label="Countries in Page" value={topCountries.length.toString()} detail="Visible geographies in the current result window" />
              <SummaryBox label="Active Filters" value={activeFilters.length.toString()} detail="Shareable through the URL" />
            </div>
          </div>
        </div>

        <div className="border-b border-zinc-800/80 px-5 py-4 md:px-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <input
                value={localSearch}
                onChange={(event) => setLocalSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitSearch();
                }}
                placeholder="Search institution, title, threat actor, or incident context"
                className="input-field w-full py-2.5 pl-10 pr-10"
              />
              {localSearch && (
                <button
                  onClick={() => {
                    setLocalSearch("");
                    push({ search: undefined, page: 1 });
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 transition-colors hover:text-zinc-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={submitSearch} className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-300">
                Search
              </button>
              <Link href="/map" className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100">
                <MapIcon className="h-4 w-4" />
                Map
              </Link>
              <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
                <ViewButton label="List" active={view === "list"} onClick={() => push({ view: "list" })} icon={List} />
                <ViewButton label="Cards" active={view === "cards"} onClick={() => push({ view: "cards" })} icon={Grid2x2} />
              </div>
              <div className="relative">
                <select
                  value={perPage}
                  onChange={(event) => push({ per_page: parseInt(event.target.value, 10), page: 1 })}
                  className="select-field px-3 py-2 pr-8 text-sm"
                >
                  {[10, 25, 50, 100].map((count) => (
                    <option key={count} value={count}>
                      {count}/page
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {activeFilters.length > 0 ? (
              activeFilters.map((filter) => (
                <FilterPill key={filter.key} label={filter.label} onRemove={() => push({ [filter.key]: undefined, page: 1 })} />
              ))
            ) : (
              <span className="ops-chip">
                <Filter className="h-3 w-3" />
                No active filters
              </span>
            )}
            {(activeFilters.length > 0 || search) && (
              <button onClick={clearFilters} className="text-xs text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-200 hover:underline">
                Clear all
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-0 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="border-b border-zinc-800/80 bg-[#0d1119]/70 px-5 py-5 xl:border-b-0 xl:border-r xl:px-6">
            <div className="mb-5">
              <p className="section-label mb-2">Analyst Filters</p>
              <h2 className="text-base font-semibold text-zinc-100">Refine the working set</h2>
            </div>
            <div className="space-y-4">
              <FilterSelect
                label="Country"
                value={country}
                onChange={(value) => push({ country: value || undefined, page: 1 })}
              >
                <option value="">All countries</option>
                {filtersQuery.data?.countries.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                label="Attack Type"
                value={attackCategory}
                onChange={(value) => push({ attack_category: value || undefined, page: 1 })}
              >
                <option value="">All attack types</option>
                {filtersQuery.data?.attack_categories.map((value) => (
                  <option key={value} value={value}>
                    {formatAttackCategory(value)}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                label="Ransomware Family"
                value={ransomware}
                onChange={(value) => push({ ransomware_family: value || undefined, page: 1 })}
              >
                <option value="">All families</option>
                {filtersQuery.data?.ransomware_families.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                label="Year"
                value={year}
                onChange={(value) => push({ year: value || undefined, page: 1 })}
              >
                <option value="">All years</option>
                {filtersQuery.data?.years.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </FilterSelect>
            </div>

            <div className="mt-6 rounded-xl border border-zinc-800/70 bg-zinc-900/30 p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Current page countries</p>
              <div className="mt-3 space-y-2">
                {topCountries.length > 0 ? topCountries.map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-zinc-300">
                      {getCountryFlag(name)} {name}
                    </span>
                    <span className="font-mono text-emerald-300">{count}</span>
                  </div>
                )) : (
                  <p className="text-sm text-zinc-500">No country distribution in the current page window yet.</p>
                )}
              </div>
            </div>
          </aside>

          <section className="min-w-0 px-0 xl:px-0">
            <div className="border-b border-zinc-800/80 px-5 py-4 md:px-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-zinc-400">
                  Showing <span className="font-mono text-zinc-100">{incidents.length}</span> of{" "}
                  <span className="font-mono text-zinc-100">{total.toLocaleString()}</span> filtered incidents
                  {search ? (
                    <>
                      {" "}for <span className="text-emerald-300">“{search}”</span>
                    </>
                  ) : null}
                </p>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>Sort</span>
                  <SortChip label="Date" active={sortBy === "incident_date"} order={sortOrder} onClick={() => toggleSort("incident_date")} />
                  <SortChip label="Institution" active={sortBy === "institution_name"} order={sortOrder} onClick={() => toggleSort("institution_name")} />
                  <SortChip label="Country" active={sortBy === "country"} order={sortOrder} onClick={() => toggleSort("country")} />
                  <SortChip label="Attack" active={sortBy === "attack_category"} order={sortOrder} onClick={() => toggleSort("attack_category")} />
                </div>
              </div>
            </div>

            <div className="px-5 py-5 md:px-6">
              {incidentsQuery.isLoading ? (
                <LoadingState />
              ) : incidents.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/35 px-6 py-16 text-center">
                  <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
                  <p className="text-sm text-zinc-400">No incidents match the current search and filter combination.</p>
                </div>
              ) : view === "cards" ? (
                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {incidents.map((incident) => (
                    <IncidentCard
                      key={incident.incident_id}
                      incident={incident}
                      visited={visitedIds.has(incident.incident_id)}
                      searchParams={searchParams.toString()}
                    />
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-zinc-800/80">
                  <div className="overflow-x-auto">
                    <table className="ops-table">
                      <thead>
                        <tr>
                          <th>Sev</th>
                          <th>Institution</th>
                          <th>Date</th>
                          <th>Attack</th>
                          <th>Threat Actor</th>
                          <th>Country</th>
                          <th>TLP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {incidents.map((incident) => (
                          <IncidentRow
                            key={incident.incident_id}
                            incident={incident}
                            visited={visitedIds.has(incident.incident_id)}
                            searchParams={searchParams.toString()}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {incidentsQuery.data && incidentsQuery.data.pagination.total_pages > 1 && (
                <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-xs font-mono text-zinc-500">
                    {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1">
                    <PageButton disabled={!incidentsQuery.data.pagination.has_prev} onClick={() => push({ page: 1 })}>
                      «
                    </PageButton>
                    <PageButton disabled={!incidentsQuery.data.pagination.has_prev} onClick={() => push({ page: page - 1 })}>
                      <ChevronLeft className="h-4 w-4" />
                    </PageButton>
                    {buildPageNumbers(page, incidentsQuery.data.pagination.total_pages).map((pageNumber) => (
                      <button
                        key={pageNumber}
                        onClick={() => push({ page: pageNumber })}
                        className={cn(
                          "h-8 w-8 rounded-lg text-xs font-mono transition-colors",
                          pageNumber === page
                            ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                            : "text-zinc-500 hover:bg-zinc-900/60 hover:text-zinc-200",
                        )}
                      >
                        {pageNumber}
                      </button>
                    ))}
                    <PageButton disabled={!incidentsQuery.data.pagination.has_next} onClick={() => push({ page: page + 1 })}>
                      <ChevronRight className="h-4 w-4" />
                    </PageButton>
                    <PageButton disabled={!incidentsQuery.data.pagination.has_next} onClick={() => push({ page: incidentsQuery.data.pagination.total_pages })}>
                      »
                    </PageButton>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function IncidentRow({
  incident,
  visited,
  searchParams,
}: {
  incident: Awaited<ReturnType<typeof getIncidents>>["incidents"][number];
  visited: boolean;
  searchParams: string;
}) {
  const attackType = incident.attack_category || incident.attack_type_hint;
  const detailHref = `/incidents/${incident.incident_id}${searchParams ? `?from=${encodeURIComponent(searchParams)}` : ""}`;
  const sev = severityFromCategory(attackType);
  const tlp = deriveTlp({
    attackCategory: attackType,
    severity: sev,
    hasLeakSite: Boolean(incident.ransomware_family),
  });
  return (
    <tr className={cn(visited && "opacity-65")}>
      <td>
        <SeverityPill severity={sev} />
      </td>
      <td className="max-w-[320px]">
        <Link href={detailHref} className={cn("block text-sm font-semibold transition-colors hover:text-emerald-300", visited ? "text-zinc-400" : "text-zinc-100")}>
          {incident.institution_name}
        </Link>
        {(incident.enriched_summary || incident.title) && (
          <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{incident.enriched_summary || incident.title}</p>
        )}
      </td>
      <td className="whitespace-nowrap font-mono text-zinc-400">{formatDate(incident.incident_date)}</td>
      <td>
        <div className="flex flex-wrap gap-1.5">
          {attackType && <span className={cn("tag", getAttackTypeColor(attackType))}>{formatAttackCategory(attackType)}</span>}
          {incident.ransomware_family && <span className="tag border-red-400/20 bg-red-400/10 text-red-300">{incident.ransomware_family}</span>}
        </div>
      </td>
      <td>
        {incident.threat_actor_name ? (
          <span className="tag border-indigo-400/20 bg-indigo-400/10 text-indigo-300">{incident.threat_actor_name}</span>
        ) : (
          <span className="text-xs text-zinc-600">—</span>
        )}
      </td>
      <td className="whitespace-nowrap text-zinc-400">
        {incident.country ? `${getCountryFlag(incident.country_code || incident.country)} ${incident.country}` : "—"}
      </td>
      <td>
        <TlpBadge level={tlp} />
      </td>
    </tr>
  );
}

function IncidentCard({
  incident,
  visited,
  searchParams,
}: {
  incident: Awaited<ReturnType<typeof getIncidents>>["incidents"][number];
  visited: boolean;
  searchParams: string;
}) {
  const attackType = incident.attack_category || incident.attack_type_hint;
  const detailHref = `/incidents/${incident.incident_id}${searchParams ? `?from=${encodeURIComponent(searchParams)}` : ""}`;
  return (
    <Link
      href={detailHref}
      className={cn(
        "rounded-2xl border border-zinc-800/80 bg-[#10131c]/95 p-4 transition-colors hover:border-emerald-400/30",
        visited && "opacity-65",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("truncate text-base font-semibold", visited ? "text-zinc-400" : "text-zinc-100")}>
            {incident.institution_name}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {incident.country ? `${getCountryFlag(incident.country_code || incident.country)} ${incident.country}` : "Unknown country"} · {formatDate(incident.incident_date)}
          </p>
        </div>
        <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-2 py-1 text-[10px] font-mono text-zinc-400">
          {incident.source_count && incident.source_count > 0 ? `${incident.source_count} src` : "1 src"}
        </span>
      </div>
      {(incident.enriched_summary || incident.title) && (
        <p className="mt-3 line-clamp-3 text-sm text-zinc-500">{incident.enriched_summary || incident.title}</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {attackType && <span className={cn("tag", getAttackTypeColor(attackType))}>{formatAttackCategory(attackType)}</span>}
        {incident.ransomware_family && <span className="tag border-red-400/20 bg-red-400/10 text-red-300">{incident.ransomware_family}</span>}
        {incident.threat_actor_name && <span className="tag border-indigo-400/20 bg-indigo-400/10 text-indigo-300">{incident.threat_actor_name}</span>}
      </div>
    </Link>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</span>
      <div className="relative">
        <select value={value} onChange={(event) => onChange(event.target.value)} className="select-field w-full px-3 py-2 pr-8 text-sm">
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
      </div>
    </label>
  );
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-300">
      {label}
      <button onClick={onRemove} className="transition-colors hover:text-zinc-100">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function ViewButton({
  label,
  active,
  onClick,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: typeof List;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
        active ? "bg-emerald-400/10 text-emerald-300" : "text-zinc-500 hover:text-zinc-200",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function SortChip({
  label,
  active,
  order,
  onClick,
}: {
  label: string;
  active: boolean;
  order: SortOrder;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
        active ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-zinc-800 text-zinc-500 hover:text-zinc-200",
      )}
    >
      {label}
      {active ? order === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3" />}
    </button>
  );
}

function SummaryBox({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-2 font-mono text-2xl text-zinc-100">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{detail}</p>
    </div>
  );
}

function PageButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-900/60 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function buildPageNumbers(currentPage: number, totalPages: number) {
  const width = 5;
  const half = Math.floor(width / 2);
  let start = Math.max(1, currentPage - half);
  const end = Math.min(totalPages, start + width - 1);
  start = Math.max(1, end - width + 1);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-20 rounded-2xl border border-zinc-800/70 bg-zinc-900/30 skeleton" />
      ))}
    </div>
  );
}

