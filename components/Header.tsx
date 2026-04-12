"use client";

import { usePathname, useRouter } from "next/navigation";
import { Search, RefreshCw, Menu, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

const pageMeta: Record<string, { label: string; description: string }> = {
  "/":              { label: "Dashboard",         description: "Global threat overview" },
  "/incidents":     { label: "Incidents",          description: "Verified education sector incidents" },
  "/map":           { label: "Global Map",          description: "Geographic threat distribution" },
  "/attacks":       { label: "Attack Intelligence", description: "TTPs, vectors & MITRE mapping" },
  "/ransomware":    { label: "Ransomware",          description: "Family tracking & economics" },
  "/threat-actors": { label: "Threat Actors",       description: "Group profiles & attribution" },
  "/analytics":     { label: "Impact Analytics",    description: "Financial, regulatory & recovery data" },
  "/admin":         { label: "Admin Panel",          description: "Pipeline controls & exports" },
};

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDetail = pathname.startsWith("/incidents/") && pathname !== "/incidents";
  const meta = isDetail
    ? { label: "Incident Detail", description: "Full CTI enrichment report" }
    : (pageMeta[pathname] ?? { label: "EduThreat-CTI", description: "Education Sector CTI" });

  // Breadcrumb for detail pages
  const breadcrumb = isDetail
    ? [{ label: "Incidents", href: "/incidents" }, { label: "Detail" }]
    : null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/incidents?search=${encodeURIComponent(search.trim())}`);
      setSearch("");
      setFocused(false);
    }
  };

  const handleRefresh = () => {
    setSpinning(true);
    qc.invalidateQueries();
    setTimeout(() => setSpinning(false), 1000);
  };

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <header className="h-14 border-b border-zinc-800/80 bg-[#09091a]/80 backdrop-blur-md flex items-center justify-between px-4 gap-4 shrink-0">
      {/* Left: menu + title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-md hover:bg-zinc-800 transition-colors shrink-0"
        >
          <Menu className="w-4 h-4 text-zinc-400" />
        </button>

        <div className="min-w-0">
          {breadcrumb ? (
            <div className="flex items-center gap-1.5 text-[12px]">
              {breadcrumb.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />}
                  {crumb.href ? (
                    <Link href={crumb.href} className="text-zinc-500 hover:text-cyan-400 transition-colors font-medium">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-zinc-300 font-medium">{crumb.label}</span>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-[14px] font-semibold text-zinc-100 truncate">{meta.label}</h1>
              <span className="hidden sm:inline text-[11px] text-zinc-600 truncate">— {meta.description}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: search + actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Search */}
        <form onSubmit={handleSearch} className="hidden sm:block">
          <div className={`relative flex items-center transition-all duration-200 ${focused ? "w-52" : "w-40"}`}>
            <Search className="absolute left-2.5 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="w-full pl-8 pr-3 py-1.5 text-[12px] bg-zinc-900/60 border border-zinc-800
                         rounded-md text-zinc-200 placeholder:text-zinc-600
                         focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
            />
            {!focused && (
              <span className="absolute right-2 text-[10px] text-zinc-700 font-mono pointer-events-none">/</span>
            )}
          </div>
        </form>

        {/* Refresh */}
        <button
          onClick={handleRefresh}
          className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Refresh all data"
        >
          <RefreshCw className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`} />
        </button>

        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
          R
        </div>
      </div>
    </header>
  );
}
