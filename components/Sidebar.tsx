"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { cn, formatNumber } from "@/lib/utils";
import { getStats } from "@/lib/api";
import {
  LayoutDashboard,
  FileText,
  Globe2,
  Shield,
  Users,
  BarChart3,
  AlertTriangle,
  X,
  Lock,
  Target,
  Share2,
  Rss,
  ClipboardList,
  Layers,
  Cog,
  Waypoints,
  type LucideIcon,
} from "lucide-react";

type BadgeKey = "incidents" | "actors" | "ransomware" | "feeds";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: BadgeKey;
  dot?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    group: "Overview",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Incidents", href: "/incidents", icon: FileText, badgeKey: "incidents" },
      { name: "Investigations", href: "/investigations", icon: Share2, dot: true },
      { name: "Geo Map", href: "/map", icon: Globe2 },
    ],
  },
  {
    group: "Intelligence",
    items: [
      { name: "Intel Graph", href: "/intel-graph", icon: Waypoints, dot: true },
      { name: "Campaigns", href: "/campaigns", icon: Layers },
      { name: "Attack Intel", href: "/attacks", icon: AlertTriangle },
      { name: "Threat Actors", href: "/threat-actors", icon: Users, badgeKey: "actors" },
      { name: "Ransomware", href: "/ransomware", icon: Lock, badgeKey: "ransomware" },
      { name: "MITRE ATT&CK", href: "/mitre", icon: Target },
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    group: "Knowledge",
    items: [
      { name: "Reports", href: "/reports", icon: FileText },
      { name: "Intel Feeds", href: "/feeds", icon: Rss, badgeKey: "feeds" },
    ],
  },
  {
    group: "System",
    items: [
      { name: "Components", href: "/components", icon: Layers },
      { name: "Manual Review", href: "/admin/review", icon: ClipboardList },
      { name: "Admin", href: "/admin", icon: Cog },
    ],
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: getStats, staleTime: 60_000 });

  const badges: Record<BadgeKey, string | undefined> = {
    incidents: stats ? formatNumber(stats.education_incidents) : undefined,
    actors: stats ? formatNumber(stats.unique_threat_actors) : undefined,
    ransomware: stats ? formatNumber(stats.unique_ransomware_families) : undefined,
    feeds: stats ? formatNumber(stats.data_sources || 18) : undefined,
  };

  const handleNavClick = () => {
    if (onClose && window.innerWidth < 1024) onClose();
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col lg:static",
          "w-[232px] border-r border-zinc-800/80 bg-[#0a0c14]/95 backdrop-blur-xl",
          "transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:transform-none",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/80 px-4 py-3.5">
          <Link href="/" className="flex items-center gap-2.5" onClick={handleNavClick}>
            <div className="relative grid h-7 w-7 place-items-center rounded-[7px] bg-gradient-to-br from-emerald-300 to-indigo-400 text-[#08110f] shadow-[0_0_18px_rgba(0,216,180,0.35)]">
              <Shield className="h-3.5 w-3.5" strokeWidth={2.4} />
            </div>
            <div className="leading-tight">
              <div className="text-[14px] font-bold tracking-tight text-zinc-100">
                Edu<span className="text-emerald-400">Threat</span>
              </div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                CTI Platform · v2.0
              </div>
            </div>
          </Link>
          <button onClick={onClose} className="rounded p-1.5 transition-colors hover:bg-zinc-800 lg:hidden">
            <X className="h-4 w-4 text-zinc-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 pb-4 pt-2">
          {NAV.map((g) => (
            <div key={g.group}>
              <div className="px-2.5 pb-1 pt-3.5 text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-600">
                {g.group}
              </div>
              {g.items.map((item) => {
                const active = isActive(item.href);
                const badge = item.badgeKey ? badges[item.badgeKey] : undefined;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={handleNavClick}
                    className={cn(
                      "flex items-center gap-2.5 rounded-[5px] border px-2.5 py-[7px] text-[12.5px] font-medium transition-colors",
                      active
                        ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                        : "border-transparent text-zinc-400 hover:bg-white/[0.025] hover:text-zinc-100",
                    )}
                  >
                    <item.icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-emerald-300" : "text-zinc-600")} />
                    <span className="truncate">{item.name}</span>
                    {badge && (
                      <span className={cn("ml-auto font-mono text-[10px]", active ? "text-emerald-300" : "text-zinc-600")}>
                        {badge}
                      </span>
                    )}
                    {item.dot && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_6px_#ff4757]" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Status footer */}
        <div className="shrink-0 border-t border-zinc-800/80 p-2.5">
          <div className="rounded-[5px] border border-emerald-400/20 bg-emerald-400/5 px-3 py-2.5">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-300">
              <span className="dot dot-clear" />
              Operational
            </div>
            <div className="mt-1 text-[9.5px] leading-tight text-zinc-500">
              {stats ? formatNumber(stats.data_sources || 18) : "18"} feeds · 4 enrichers
              <br />
              canonical layer live · {stats ? formatNumber(stats.education_incidents) : "—"} cases
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
