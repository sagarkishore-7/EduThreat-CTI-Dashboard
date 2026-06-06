"use client";

import { Card, CardHead, CardBody } from "@/components/ui/Card";
import { KpiTile } from "@/components/ui/KpiTile";
import { TlpBadge } from "@/components/ui/TlpBadge";
import { SeverityPill } from "@/components/ui/SeverityPill";
import { Sparkline } from "@/components/ui/Sparkline";
import { GraduationCap, Lock } from "lucide-react";

function Swatch({ name, varName }: { name: string; varName: string }) {
  return (
    <div className="rounded-md border border-zinc-800/70 bg-zinc-900/30 p-2.5">
      <div className="h-9 w-full rounded" style={{ background: `var(${varName})` }} />
      <div className="mt-2 text-[11px] font-medium text-zinc-200">{name}</div>
      <div className="font-mono text-[10px] text-zinc-500">{varName}</div>
    </div>
  );
}

export default function ComponentsPage() {
  return (
    <div className="animate-fade-in space-y-3.5">
      {/* Surfaces & semantic palette */}
      <Card>
        <CardHead title="Color System" sub="Surface ladder, brand, and semantic tokens" />
        <CardBody>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-7">
            <Swatch name="Brand" varName="--brand" />
            <Swatch name="Pulse" varName="--pulse" />
            <Swatch name="Threat" varName="--threat" />
            <Swatch name="Warn" varName="--warn" />
            <Swatch name="Watch" varName="--watch" />
            <Swatch name="Info" varName="--info" />
            <Swatch name="Clear" varName="--clear" />
          </div>
        </CardBody>
      </Card>

      {/* TLP + severity */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHead title="TLP 2.0 Markings" sub="Traffic Light Protocol classification" />
          <CardBody className="flex flex-wrap gap-2">
            <TlpBadge level="red" />
            <TlpBadge level="amber" />
            <TlpBadge level="amber-strict" />
            <TlpBadge level="green" />
            <TlpBadge level="clear" />
          </CardBody>
        </Card>
        <Card>
          <CardHead title="Severity Pills" sub="Incident severity banding" />
          <CardBody className="flex flex-wrap items-center gap-2">
            <SeverityPill severity="critical" />
            <SeverityPill severity="high" />
            <SeverityPill severity="medium" />
            <SeverityPill severity="low" />
            <SeverityPill severity="info" />
          </CardBody>
        </Card>
      </div>

      {/* Pills + chips */}
      <Card>
        <CardHead title="Pills & Chips" sub="Categories, actors, and status chips" />
        <CardBody className="flex flex-wrap items-center gap-2">
          <span className="pill pill-brand">Brand</span>
          <span className="pill pill-pulse">LockBit 3.0</span>
          <span className="pill pill-threat">Ransomware</span>
          <span className="pill pill-warn">High</span>
          <span className="pill pill-mute normal-case tracking-normal">data breach</span>
          <span className="ops-chip">Default chip</span>
          <span className="ops-chip ops-chip-brand">Brand chip</span>
          <span className="ops-chip ops-chip-pulse">Pulse chip</span>
          <span className="ops-chip ops-chip-danger">Danger chip</span>
        </CardBody>
      </Card>

      {/* Dots */}
      <Card>
        <CardHead title="Status Dots" sub="Live indicators" />
        <CardBody className="flex flex-wrap items-center gap-5 text-[12px] text-zinc-400">
          <span className="inline-flex items-center gap-2"><span className="dot dot-pulse" /> Live</span>
          <span className="inline-flex items-center gap-2"><span className="dot dot-threat" /> Critical</span>
          <span className="inline-flex items-center gap-2"><span className="dot dot-warn" /> High</span>
          <span className="inline-flex items-center gap-2"><span className="dot dot-clear" /> Operational</span>
          <span className="inline-flex items-center gap-2"><span className="dot dot-mute" /> Idle</span>
        </CardBody>
      </Card>

      {/* KPI tiles */}
      <Card>
        <CardHead title="KPI Tiles" sub="Headline metric with inline trend sparkline" />
        <CardBody>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <KpiTile label="Education Incidents" value="1,005" icon={GraduationCap} accent="brand" trend={[7, 3, 8, 3, 7, 6, 4, 3]} deltaPct={-21.4} caption="vs prior" />
            <KpiTile label="Active Ransomware" value="361" icon={Lock} accent="threat" trend={[2, 3, 1, 5, 3, 4, 2, 3]} deltaPct={7.1} caption="40 families" />
            <KpiTile label="Threat Actors" value="150" icon={GraduationCap} accent="pulse" trend={[3, 2, 1, 1, 3, 4, 2, 3]} deltaPct={12} caption="253 attributed" />
          </div>
        </CardBody>
      </Card>

      {/* Buttons + inputs + sparkline */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHead title="Buttons" sub="Primary, secondary, ghost, danger" />
          <CardBody className="flex flex-wrap items-center gap-2">
            <button className="rounded-md bg-emerald-400 px-3.5 py-2 text-[12px] font-semibold text-zinc-950 transition-colors hover:bg-emerald-300">Primary</button>
            <button className="rounded-md border border-zinc-700 bg-zinc-900/60 px-3.5 py-2 text-[12px] font-medium text-zinc-200 transition-colors hover:bg-zinc-800">Secondary</button>
            <button className="rounded-md px-3.5 py-2 text-[12px] font-medium text-zinc-300 transition-colors hover:bg-zinc-900/60">Ghost</button>
            <button className="rounded-md border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-[12px] font-medium text-red-300 transition-colors hover:bg-red-500/20">Danger</button>
          </CardBody>
        </Card>
        <Card>
          <CardHead title="Inputs & Sparkline" sub="Form field, segmented control, mini trend" />
          <CardBody className="space-y-3">
            <input className="input-field px-3 py-2" placeholder="Search incidents, actors, IOCs…" />
            <div className="seg">
              <button className="on">VOL</button>
              <button>SEV</button>
              <button>ACTOR</button>
            </div>
            <div className="flex items-center gap-3">
              <Sparkline values={[4, 6, 5, 8, 7, 10, 9, 12, 14]} color="#00d8b4" width={120} height={32} />
              <Sparkline values={[12, 9, 11, 7, 8, 5, 6, 4, 3]} color="#ff4757" width={120} height={32} />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
