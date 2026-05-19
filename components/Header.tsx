"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  RefreshCw,
  Menu,
  ChevronRight,
  UserRound,
  ShieldCheck,
  LogOut,
  Settings,
  ClipboardList,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ADMIN_SESSION_KEY,
  getStoredAdminSession,
  loginV2Admin,
  logoutV2Admin,
  setStoredAdminSession,
} from "@/lib/admin-api";

const pageMeta: Record<string, { label: string; description: string }> = {
  "/": { label: "Executive Briefing", description: "Analyst-ready education sector threat summary" },
  "/incidents": { label: "Incidents", description: "Canonical incident register and searchable casework" },
  "/map": { label: "Geography", description: "Where retained education-sector pressure is concentrating" },
  "/attacks": { label: "Tradecraft", description: "Attack patterns, intrusion clusters, and access signals" },
  "/ransomware": { label: "Ransomware", description: "Family prevalence, extortion pressure, and victimization" },
  "/threat-actors": { label: "Threat Actors", description: "Attributed groups, targeting, and family overlap" },
  "/analytics": { label: "Exposure", description: "Victimology, records exposure, and analyst workbook views" },
  "/admin": { label: "Operations", description: "Runtime health, collection plans, and quality controls" },
  "/admin/review": { label: "Manual Review", description: "Read-only queue for incidents that exhausted automation" },
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState<"login" | "logout" | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  const isDetail = pathname.startsWith("/incidents/") && pathname !== "/incidents";
  const meta = isDetail
    ? { label: "Incident Detail", description: "Structured case file and intelligence narrative" }
    : (pageMeta[pathname] ?? { label: "EduThreat-CTI", description: "Education Sector CTI" });

  const breadcrumb = isDetail
    ? [{ label: "Incidents", href: "/incidents" }, { label: "Detail" }]
    : null;

  useEffect(() => {
    setToken(getStoredAdminSession());

    const onStorage = (event: StorageEvent) => {
      if (event.key === ADMIN_SESSION_KEY) {
        setToken(event.newValue);
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!menuOpen) return;
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handler);
    window.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("keydown", keyHandler);
    };
  }, [menuOpen]);

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

  const handleAdminLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthBusy("login");
    setAuthError(null);
    try {
      const response = await loginV2Admin(username, password);
      setStoredAdminSession(response.session_token);
      setToken(response.session_token);
      setPassword("");
      setMenuOpen(false);
      qc.invalidateQueries();
      router.push("/admin");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setAuthBusy(null);
    }
  };

  const handleAdminLogout = async () => {
    setAuthBusy("logout");
    setAuthError(null);
    try {
      if (token) {
        await logoutV2Admin(token);
      }
    } catch {
      // Treat logout as successful even if the session already expired.
    } finally {
      setStoredAdminSession(null);
      setToken(null);
      setPassword("");
      setMenuOpen(false);
      qc.clear();
      if (pathname.startsWith("/admin")) {
        router.push("/");
      }
      setAuthBusy(null);
    }
  };

  return (
    <header className="relative z-30 h-14 overflow-visible border-b border-zinc-800/80 bg-[#09091a]/80 backdrop-blur-md flex items-center justify-between px-4 gap-4 shrink-0">
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

      <div className="flex items-center gap-2 shrink-0">
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
              className="w-full pl-8 pr-3 py-1.5 text-[12px] bg-zinc-900/60 border border-zinc-800 rounded-md text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
            />
            {!focused && (
              <span className="absolute right-2 text-[10px] text-zinc-700 font-mono pointer-events-none">/</span>
            )}
          </div>
        </form>

        <button
          onClick={handleRefresh}
          className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Refresh all data"
        >
          <RefreshCw className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`} />
        </button>

        <div className="relative z-40" ref={adminMenuRef}>
          <button
            onClick={() => setMenuOpen((value) => !value)}
            className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/70 pl-2 pr-2.5 py-1 text-zinc-200 transition-colors hover:border-cyan-500/30 hover:bg-zinc-900"
            title={token ? "Admin session" : "Admin login"}
          >
            <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-600 text-white">
              {token ? <ShieldCheck className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
              {token && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-[#09091a] bg-emerald-400" />}
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-[11px] font-semibold text-zinc-100">{token ? "Admin" : "User Login"}</p>
              <p className="text-[10px] text-zinc-500">{token ? "Session active" : "Operations access"}</p>
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-zinc-800 bg-[#0d0d1a] p-4 shadow-2xl shadow-black/40">
              {!token ? (
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <p className="section-label mb-1">Admin Access</p>
                    <h2 className="text-sm font-semibold text-zinc-100">Sign in to operations</h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      Use the admin credentials here when you need runtime controls or review access.
                    </p>
                  </div>

                  <label className="block">
                    <span className="mb-1 block text-[10px] uppercase tracking-widest text-zinc-500">Username</span>
                    <input
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-500/40"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[10px] uppercase tracking-widest text-zinc-500">Password</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-500/40"
                    />
                  </label>

                  {authError && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                      {authError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authBusy === "login"}
                    className="w-full rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-cyan-400 disabled:opacity-60"
                  >
                    {authBusy === "login" ? "Signing in..." : "Sign In as Admin"}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="section-label mb-1">Admin Session</p>
                    <h2 className="text-sm font-semibold text-zinc-100">Operations unlocked</h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      Admin tools are intentionally hidden from the main navigation. Open them from here when needed.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Link
                      href="/admin"
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-200 transition-colors hover:border-cyan-500/30 hover:text-cyan-300"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Operations Console
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/admin/review"
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-200 transition-colors hover:border-cyan-500/30 hover:text-cyan-300"
                    >
                      <span className="inline-flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" />
                        Manual Review
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <button
                    onClick={handleAdminLogout}
                    disabled={authBusy === "logout"}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-60"
                  >
                    <LogOut className="h-4 w-4" />
                    {authBusy === "logout" ? "Signing out..." : "Sign Out"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
