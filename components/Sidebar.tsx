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
  Settings,
  Lock,
  Radio,
} from "lucide-react";

const navigation = [
  { name: "Dashboard",          href: "/",              icon: LayoutDashboard, group: "main" },
  { name: "Incidents",          href: "/incidents",     icon: FileText,        group: "main" },
  { name: "Global Map",         href: "/map",           icon: Globe2,          group: "main" },
  { name: "Attack Intel",       href: "/attacks",       icon: AlertTriangle,   group: "intel" },
  { name: "Ransomware",         href: "/ransomware",    icon: Lock,            group: "intel" },
  { name: "Threat Actors",      href: "/threat-actors", icon: Users,           group: "intel" },
  { name: "Impact Analytics",   href: "/analytics",     icon: BarChart3,       group: "intel" },
];

const adminNav = [
  { name: "Admin Panel", href: "/admin", icon: Settings },
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
          "w-56 border-r border-zinc-800/80 bg-[#09091a]",
          "transform transition-transform duration-300 ease-in-out lg:transform-none lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-800/80 shrink-0">
          <Link href="/" className="flex items-center gap-2.5" onClick={handleNavClick}>
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center shrink-0">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="leading-tight">
              <span className="font-bold text-[13px] tracking-tight text-zinc-100">EduThreat</span>
              <span className="font-bold text-[13px] text-cyan-400">-CTI</span>
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
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {/* Main */}
          <p className="px-2 pb-1.5 text-[9px] uppercase tracking-widest font-semibold text-zinc-600">
            Overview
          </p>
          {navigation.filter(n => n.group === "main").map((item) => (
            <NavItem key={item.name} item={item} active={isActive(item.href)} onClick={handleNavClick} />
          ))}

          {/* Intelligence */}
          <p className="px-2 pt-4 pb-1.5 text-[9px] uppercase tracking-widest font-semibold text-zinc-600">
            Intelligence
          </p>
          {navigation.filter(n => n.group === "intel").map((item) => (
            <NavItem key={item.name} item={item} active={isActive(item.href)} onClick={handleNavClick} />
          ))}

          {/* Admin */}
          <p className="px-2 pt-4 pb-1.5 text-[9px] uppercase tracking-widest font-semibold text-zinc-600">
            Management
          </p>
          {adminNav.map((item) => (
            <NavItem key={item.name} item={item} active={isActive(item.href)} onClick={handleNavClick} />
          ))}
        </nav>

        {/* Status footer */}
        <div className="px-3 pb-4 shrink-0">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-emerald-400 font-mono font-semibold">LIVE</p>
              <p className="text-[9px] text-zinc-600 truncate">All systems operational</p>
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
        "flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all",
        active
          ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
          : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent"
      )}
    >
      <item.icon className={cn("w-4 h-4 shrink-0", active ? "text-cyan-400" : "text-zinc-600")} />
      {item.name}
    </Link>
  );
}
