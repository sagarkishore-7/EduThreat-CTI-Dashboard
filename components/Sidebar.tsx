"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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
  Radio,
} from "lucide-react";

const navigation = [
  { name: "Dashboard",      href: "/",              icon: LayoutDashboard, group: "overview" },
  { name: "Incidents",      href: "/incidents",     icon: FileText,        group: "overview" },
  { name: "Analytics",      href: "/analytics",     icon: BarChart3,       group: "intel" },
  { name: "Tradecraft",     href: "/attacks",       icon: AlertTriangle,   group: "intel" },
  { name: "Ransomware",     href: "/ransomware",    icon: Lock,            group: "intel" },
  { name: "Threat Actors",  href: "/threat-actors", icon: Users,           group: "intel" },
  { name: "Geography",      href: "/map",           icon: Globe2,          group: "knowledge" },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();

  const handleNavClick = () => {
    if (onClose && window.innerWidth < 1024) onClose();
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 flex flex-col",
          "w-60 border-r border-zinc-800/80 bg-[#0a0c14]/95 backdrop-blur-xl",
          "transform transition-transform duration-300 ease-in-out lg:transform-none lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-4 shrink-0">
          <Link href="/" className="flex items-center gap-2.5" onClick={handleNavClick}>
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-300 via-emerald-400 to-indigo-400 text-[#08110f] shadow-[0_0_18px_rgba(0,216,180,0.25)]">
              <Shield className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-[13px] tracking-tight text-zinc-100">
                EduThreat<span className="text-emerald-400">-CTI</span>
              </div>
              <div className="text-[9px] uppercase tracking-[0.16em] text-zinc-500">Education Sector CTI</div>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-2 pb-1.5 text-[9px] uppercase tracking-[0.18em] font-semibold text-zinc-600">
            Overview
          </p>
          {navigation.filter((n) => n.group === "overview").map((item) => (
            <NavItem key={item.name} item={item} active={isActive(item.href)} onClick={handleNavClick} />
          ))}

          <p className="px-2 pt-4 pb-1.5 text-[9px] uppercase tracking-[0.18em] font-semibold text-zinc-600">
            Intelligence
          </p>
          {navigation.filter((n) => n.group === "intel").map((item) => (
            <NavItem key={item.name} item={item} active={isActive(item.href)} onClick={handleNavClick} />
          ))}

          <p className="px-2 pt-4 pb-1.5 text-[9px] uppercase tracking-[0.18em] font-semibold text-zinc-600">
            Knowledge
          </p>
          {navigation.filter((n) => n.group === "knowledge").map((item) => (
            <NavItem key={item.name} item={item} active={isActive(item.href)} onClick={handleNavClick} />
          ))}
        </nav>

        {/* Status footer */}
        <div className="px-3 pb-4 shrink-0">
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-3">
            <div className="flex items-center gap-2 text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-emerald-300">
              <Radio className="h-3 w-3 animate-pulse shrink-0" />
              Live Runtime
            </div>
            <div className="min-w-0">
              <p className="mt-2 text-[10px] text-zinc-400">Canonical intelligence layer active, collecting, and shaping the merged incident graph.</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function NavItem({
  item,
  active,
  onClick,
}: {
  item: { name: string; href: string; icon: React.ComponentType<{ className?: string }> };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[12.5px] font-medium transition-all border",
        active
          ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/20 shadow-[0_0_18px_rgba(0,216,180,0.08)]"
          : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.03] border-transparent"
      )}
    >
      <item.icon className={cn("w-4 h-4 shrink-0", active ? "text-emerald-300" : "text-zinc-600")} />
      {item.name}
    </Link>
  );
}
