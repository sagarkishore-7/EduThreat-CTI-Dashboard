"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getIncidents, getFilters } from "@/lib/api";
import {
  formatDate,
  formatAttackCategory,
  getAttackTypeColor,
  getCountryFlag,
  cn,
} from "@/lib/utils";
import {
  Search, Filter, ChevronLeft, ChevronRight, ArrowUpDown,
  ArrowUp, ArrowDown, AlertTriangle, CheckCircle2, Clock,
  X, SlidersHorizontal, ChevronDown,
} from "lucide-react";

export default function IncidentsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <IncidentsContent />
    </Suspense>
  );
}

type SortField = "incident_date" | "institution_name" | "country" | "attack_category";
type SortOrder = "asc" | "desc";

function IncidentsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ── Derive all state from URL ──────────────────────────────
  const page       = parseInt(searchParams.get("page")    || "1");
  const perPage    = parseInt(searchParams.get("per_page")|| "25");
  const search     = searchParams.get("search")           || "";
  const sortBy     = (searchParams.get("sort_by")         || "incident_date") as SortField;
  const sortOrder  = (searchParams.get("sort_order")      || "desc") as SortOrder;
  const country    = searchParams.get("country")          || "";
  const attackCat  = searchParams.get("attack_category")  || "";
  const ransomware = searchParams.get("ransomware_family")|| "";
  const year       = searchParams.get("year")             || "";
  const enrichedOnly  = searchParams.get("enriched_only") === "true";
  const dataBreached  = searchParams.get("data_breached") === "true";
  const showFilters   = searchParams.get("filters") !== "0";

  const [localSearch, setLocalSearch] = useState(search);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());

  // keep localSearch in sync if URL changes externally
  useEffect(() => { setLocalSearch(search); }, [search]);

  // Load visited incident IDs from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("visitedIncidents");
      if (raw) setVisitedIds(new Set(JSON.parse(raw)));
    } catch { /* ignore */ }
  }, []);

  // ── URL updater ────────────────────────────────────────────
  const push = useCallback(
    (updates: Record<string, string | number | boolean | undefined>) => {
      const p = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v === undefined || v === "" || v === false) p.delete(k);
        else p.set(k, String(v));
      });
      router.push(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const activeFilterCount = [country, attackCat, ransomware, year, enrichedOnly, dataBreached].filter(Boolean).length;

  // ── Data fetching ──────────────────────────────────────────
  const { data: filterOptions } = useQuery({ queryKey: ["filters"], queryFn: getFilters });

  const { data, isLoading } = useQuery({
    queryKey: ["incidents", page, perPage, search, sortBy, sortOrder, country, attackCat, ransomware, year, enrichedOnly, dataBreached],
    queryFn: () => getIncidents({
      page, per_page: perPage,
      search: search || undefined,
      sort_by: sortBy, sort_order: sortOrder,
      country: country || undefined,
      attack_category: attackCat || undefined,
      ransomware_family: ransomware || undefined,
      year: year ? parseInt(year) : undefined,
      enriched_only: enrichedOnly || undefined,
      data_breached: dataBreached || undefined,
    }),
    placeholderData: (prev) => prev,
  });

  // ── Handlers ───────────────────────────────────────────────
  const submitSearch = () => push({ search: localSearch || undefined, page: 1 });

  const toggleSort = (field: SortField) => {
    if (sortBy === field) push({ sort_order: sortOrder === "desc" ? "asc" : "desc", page: 1 });
    else push({ sort_by: field, sort_order: "desc", page: 1 });
  };

  const clearFilters = () => push({
    search: undefined, country: undefined, attack_category: undefined,
    ransomware_family: undefined, year: undefined,
    enriched_only: undefined, data_breached: undefined, page: 1,
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 text-zinc-600" />;
    return sortOrder === "desc"
      ? <ArrowDown className="w-3 h-3 text-cyan-400" />
      : <ArrowUp   className="w-3 h-3 text-cyan-400" />;
  };

  const ThSortable = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th className="text-left px-3 py-2.5">
      <button
        onClick={() => toggleSort(field)}
        className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        {children}
        <SortIcon field={field} />
      </button>
    </th>
  );

  const severityDot = (cat?: string | null) => {
    if (!cat) return "bg-zinc-600";
    const c = cat.toLowerCase();
    if (c === "ransomware") return "bg-red-500";
    if (c === "data_breach") return "bg-amber-500";
    if (c === "phishing" || c === "malware") return "bg-orange-500";
    return "bg-zinc-500";
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in h-full">

      {/* ── Filter + Search Bar ──────────────────────────────── */}
      <div className="bg-[#0d0d1a] border border-zinc-800 rounded-lg p-3">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by institution, title, threat actor, ID…"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitSearch(); }}
              className="w-full pl-8 pr-3 py-2 text-[13px] bg-zinc-900/60 border border-zinc-800
                         rounded-md text-zinc-200 placeholder:text-zinc-600
                         focus:outline-none focus:border-cyan-500/40 transition-colors"
            />
            {localSearch && (
              <button onClick={() => { setLocalSearch(""); push({ search: undefined, page: 1 }); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search button */}
          <button
            onClick={submitSearch}
            className="px-3 py-2 text-[12px] bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-md hover:bg-cyan-500/20 transition-colors font-medium"
          >
            Search
          </button>

          {/* Filter toggle */}
          <button
            onClick={() => push({ filters: showFilters ? "0" : undefined })}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium rounded-md border transition-colors",
              showFilters
                ? "bg-violet-500/10 border-violet-500/30 text-violet-400"
                : "bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-zinc-200"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-violet-500/30 text-violet-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Per page */}
          <div className="relative hidden sm:block">
            <select
              value={perPage}
              onChange={(e) => push({ per_page: parseInt(e.target.value), page: 1 })}
              className="pl-2 pr-6 py-2 text-[12px] bg-zinc-900/60 border border-zinc-800 rounded-md text-zinc-400 focus:outline-none appearance-none cursor-pointer"
            >
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600 pointer-events-none" />
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && filterOptions && (
          <div className="mt-3 pt-3 border-t border-zinc-800">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {/* Country */}
              <FilterSelect label="Country" value={country} onChange={(v) => push({ country: v || undefined, page: 1 })}>
                <option value="">All Countries</option>
                {filterOptions.countries.map((c) => (
                  <option key={c} value={c}>{getCountryFlag(c)} {c}</option>
                ))}
              </FilterSelect>

              {/* Attack type */}
              <FilterSelect label="Attack Type" value={attackCat} onChange={(v) => push({ attack_category: v || undefined, page: 1 })}>
                <option value="">All Types</option>
                {filterOptions.attack_categories.map((c) => (
                  <option key={c} value={c}>{formatAttackCategory(c)}</option>
                ))}
              </FilterSelect>

              {/* Ransomware */}
              <FilterSelect label="Ransomware" value={ransomware} onChange={(v) => push({ ransomware_family: v || undefined, page: 1 })}>
                <option value="">All Families</option>
                {filterOptions.ransomware_families.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </FilterSelect>

              {/* Year */}
              <FilterSelect label="Year" value={year} onChange={(v) => push({ year: v || undefined, page: 1 })}>
                <option value="">All Years</option>
                {filterOptions.years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </FilterSelect>

              {/* Toggles */}
              <div className="flex flex-col gap-1.5 col-span-1">
                <FilterToggle
                  label="Enriched only"
                  checked={enrichedOnly}
                  onChange={(v) => push({ enriched_only: v || undefined, page: 1 })}
                />
                <FilterToggle
                  label="Data breaches"
                  checked={dataBreached}
                  onChange={(v) => push({ data_breached: v || undefined, page: 1 })}
                />
              </div>

              {/* Clear */}
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors underline underline-offset-2"
                >
                  Clear all
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Results info ─────────────────────────────────────── */}
      {data && (
        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] text-zinc-600 font-mono">
            {data.pagination.total.toLocaleString()} incidents
            {search && <span className="text-zinc-500"> matching <span className="text-cyan-400">"{search}"</span></span>}
          </p>
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2">
              {country && <FilterPill label={country} onRemove={() => push({ country: undefined, page: 1 })} />}
              {attackCat && <FilterPill label={formatAttackCategory(attackCat)} onRemove={() => push({ attack_category: undefined, page: 1 })} />}
              {ransomware && <FilterPill label={ransomware} onRemove={() => push({ ransomware_family: undefined, page: 1 })} />}
              {year && <FilterPill label={year} onRemove={() => push({ year: undefined, page: 1 })} />}
              {enrichedOnly && <FilterPill label="Enriched" onRemove={() => push({ enriched_only: undefined, page: 1 })} />}
              {dataBreached && <FilterPill label="Breached" onRemove={() => push({ data_breached: undefined, page: 1 })} />}
            </div>
          )}
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────── */}
      <div className="bg-[#0d0d1a] border border-zinc-800 rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-zinc-800 bg-zinc-900/40">
                <th className="w-6 px-3 py-2.5" />
                <ThSortable field="institution_name">Institution</ThSortable>
                <ThSortable field="incident_date">Date</ThSortable>
                <ThSortable field="attack_category">Attack</ThSortable>
                <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-widest font-semibold text-zinc-500">Actor</th>
                <ThSortable field="country">Country</ThSortable>
                <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-widest font-semibold text-zinc-500">Intel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {isLoading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-3 py-3">
                      <div className="h-5 skeleton rounded w-full" style={{ opacity: 1 - i * 0.07 }} />
                    </td>
                  </tr>
                ))
              ) : data?.incidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <AlertTriangle className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                    <p className="text-sm text-zinc-600">No incidents match your criteria</p>
                    <button onClick={clearFilters} className="mt-2 text-[12px] text-cyan-500 hover:text-cyan-400">Clear filters</button>
                  </td>
                </tr>
              ) : (
                data?.incidents.map((incident) => {
                  const attackType = incident.attack_category || incident.attack_type_hint;
                  const visited = visitedIds.has(incident.incident_id);
                  const fromParam = searchParams.toString();
                  const detailHref = `/incidents/${incident.incident_id}${fromParam ? `?from=${encodeURIComponent(fromParam)}` : ""}`;
                  return (
                    <tr
                      key={incident.incident_id}
                      className={cn("hover:bg-white/[0.02] transition-colors group", visited && "opacity-60")}
                    >
                      {/* Severity dot */}
                      <td className="px-3 py-3 w-6">
                        <div className={cn("w-1.5 h-1.5 rounded-full", visited ? "bg-zinc-700" : severityDot(attackType))} />
                      </td>

                      {/* Institution */}
                      <td className="px-3 py-3 max-w-[240px]">
                        <Link
                          href={detailHref}
                          className={cn("font-medium text-[13px] hover:text-cyan-300 transition-colors block truncate", visited ? "text-zinc-500" : "text-zinc-200")}
                        >
                          {incident.institution_name}
                        </Link>
                        {incident.title && (
                          <p className="text-[11px] text-zinc-600 truncate mt-0.5">{incident.title}</p>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-[12px] text-zinc-500 font-mono">{formatDate(incident.incident_date)}</span>
                      </td>

                      {/* Attack */}
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {attackType && (
                            <span className={cn("tag", getAttackTypeColor(attackType))}>
                              {formatAttackCategory(attackType)}
                            </span>
                          )}
                          {incident.ransomware_family && (
                            <span className="tag bg-red-500/10 text-red-400 border-red-500/20">
                              {incident.ransomware_family}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="px-3 py-3">
                        {incident.threat_actor_name && (
                          <span className="tag bg-violet-500/10 text-violet-400 border-violet-500/20">
                            {incident.threat_actor_name}
                          </span>
                        )}
                      </td>

                      {/* Country */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {incident.country && (
                          <button
                            onClick={() => push({ country: incident.country, page: 1, filters: undefined })}
                            className="flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            <span className="text-base leading-none">{getCountryFlag(incident.country)}</span>
                            <span className="hidden sm:inline">{incident.country}</span>
                          </button>
                        )}
                      </td>

                      {/* Intel status */}
                      <td className="px-3 py-3">
                        {incident.llm_enriched ? (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-mono">
                            <CheckCircle2 className="w-3 h-3" /> enriched
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-zinc-600 font-mono">
                            <Clock className="w-3 h-3" /> pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ────────────────────────────────────── */}
        {data && data.pagination.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 bg-zinc-900/20">
            <p className="text-[11px] text-zinc-600 font-mono">
              {(page - 1) * perPage + 1}–{Math.min(page * perPage, data.pagination.total)} of {data.pagination.total.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <PageBtn disabled={!data.pagination.has_prev} onClick={() => push({ page: 1 })} title="First">«</PageBtn>
              <PageBtn disabled={!data.pagination.has_prev} onClick={() => push({ page: page - 1 })} title="Prev">
                <ChevronLeft className="w-3.5 h-3.5" />
              </PageBtn>
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, data.pagination.total_pages) }, (_, i) => {
                const half = 2;
                let start = Math.max(1, page - half);
                const end = Math.min(data.pagination.total_pages, start + 4);
                start = Math.max(1, end - 4);
                const p = start + i;
                if (p > data.pagination.total_pages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => push({ page: p })}
                    className={cn(
                      "w-7 h-7 text-[11px] font-mono rounded-md transition-colors",
                      p === page
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                    )}
                  >
                    {p}
                  </button>
                );
              })}
              <PageBtn disabled={!data.pagination.has_next} onClick={() => push({ page: page + 1 })} title="Next">
                <ChevronRight className="w-3.5 h-3.5" />
              </PageBtn>
              <PageBtn disabled={!data.pagination.has_next} onClick={() => push({ page: data.pagination.total_pages })} title="Last">»</PageBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */

function FilterSelect({ label, value, onChange, children }: {
  label: string; value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-2.5 pr-6 py-1.5 text-[11px] bg-zinc-900/60 border border-zinc-800 rounded-md
                   text-zinc-300 focus:outline-none focus:border-cyan-500/40 appearance-none cursor-pointer transition-colors"
      >
        {children}
      </select>
      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600 pointer-events-none" />
    </div>
  );
}

function FilterToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <div
        onClick={() => onChange(!checked)}
        className={cn(
          "w-7 h-4 rounded-full border transition-colors relative cursor-pointer",
          checked ? "bg-cyan-500/30 border-cyan-500/50" : "bg-zinc-800 border-zinc-700"
        )}
      >
        <div className={cn(
          "absolute top-0.5 w-3 h-3 rounded-full transition-all",
          checked ? "left-3.5 bg-cyan-400" : "left-0.5 bg-zinc-600"
        )} />
      </div>
      <span className="text-[11px] text-zinc-500 group-hover:text-zinc-300 transition-colors select-none">{label}</span>
    </label>
  );
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400">
      {label}
      <button onClick={onRemove} className="hover:text-violet-200"><X className="w-2.5 h-2.5" /></button>
    </span>
  );
}

function PageBtn({ children, disabled, onClick, title }: {
  children: React.ReactNode; disabled: boolean; onClick: () => void; title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-7 h-7 flex items-center justify-center text-[11px] font-mono rounded-md
                 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 disabled:opacity-30
                 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-12 rounded-lg bg-zinc-900 border border-zinc-800" />
      <div className="h-[600px] rounded-lg bg-zinc-900 border border-zinc-800" />
    </div>
  );
}
