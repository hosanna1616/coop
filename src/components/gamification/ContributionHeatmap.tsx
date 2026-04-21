"use client";

import { useMemo, useState } from "react";

type ContributionDay = {
  date: string;
  leads: number;
  merchants: number;
};

type Props = {
  activity: ContributionDay[];
  totalLeads: number;
  totalMerchants: number;
  activeDays: number;
  mostActive: { date: string; leads: number; merchants: number };
  currentStreak?: number;
  maxStreak?: number;
};

type Mode = "LEADS" | "MERCHANTS";

function levelClass(count: number) {
  if (count <= 0) return "bg-muted";
  if (count <= 2) return "bg-green-300";
  if (count <= 5) return "bg-green-500";
  if (count <= 10) return "bg-green-700";
  return "bg-lime-400 ring-1 ring-lime-200 shadow-[0_0_8px_rgba(163,230,53,0.65)]";
}

function toWeeks(days: ContributionDay[]): ContributionDay[][] {
  const weeks: ContributionDay[][] = [];
  const startPad = new Date(days[0]?.date ?? Date.now()).getDay();
  let current: ContributionDay[] = [];

  for (let i = 0; i < startPad; i += 1) {
    current.push({ date: `pad-start-${i}`, leads: 0, merchants: 0 });
  }

  for (const day of days) {
    current.push(day);
    if (current.length === 7) {
      weeks.push(current);
      current = [];
    }
  }

  if (current.length > 0) {
    while (current.length < 7) {
      current.push({ date: `pad-end-${current.length}`, leads: 0, merchants: 0 });
    }
    weeks.push(current);
  }

  return weeks;
}

export function ContributionHeatmap({
  activity,
  totalLeads,
  totalMerchants,
  activeDays,
  mostActive,
  currentStreak = 0,
  maxStreak = 0,
}: Props) {
  const [mode, setMode] = useState<Mode>("LEADS");
  const [hovered, setHovered] = useState<{
    date: string;
    leads: number;
    merchants: number;
  } | null>(null);
  const weeks = useMemo(() => toWeeks(activity), [activity]);
  const total = mode === "MERCHANTS" ? totalMerchants : totalLeads;
  const mostActiveTotal = mode === "MERCHANTS" ? mostActive.merchants : mostActive.leads;
  const metricLabel = mode === "LEADS" ? "scouts" : "merchants";

  const monthLabels = useMemo(() => {
    const labels: Array<{ index: number; label: string }> = [];
    let lastMonth = "";
    weeks.forEach((week, idx) => {
      const firstRealDay = week.find((d) => !d.date.startsWith("pad-"));
      if (!firstRealDay) return;
      const month = new Date(firstRealDay.date).toLocaleString("en-US", { month: "short" });
      if (month !== lastMonth) {
        labels.push({ index: idx, label: month });
        lastMonth = month;
      }
    });
    return labels;
  }, [weeks]);

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-mono text-sm font-semibold text-foreground">
          {total} {metricLabel} in {new Date().getFullYear()}
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("LEADS")}
            className={`rounded px-2 py-1 text-xs font-mono ${mode === "LEADS" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            Scouts
          </button>
          <button
            type="button"
            onClick={() => setMode("MERCHANTS")}
            className={`rounded px-2 py-1 text-xs font-mono ${mode === "MERCHANTS" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            Merchants
          </button>
        </div>
      </div>

      <p className="mb-3 font-mono text-xs text-muted-foreground">
        Total active days: {activeDays} | Max streak: {maxStreak} | Current: {currentStreak} | Most active: {mostActive.date || "-"} ({mostActiveTotal})
      </p>

      <div className="overflow-x-auto">
        <div className="mb-2 h-6">
          <div className="inline-flex min-h-6 rounded border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground shadow-sm">
            {hovered
              ? `${hovered.date} - ${mode === "LEADS" ? `Scouted places: ${hovered.leads}` : `Merchants inducted: ${hovered.merchants}`}`
              : "Hover a day to see exact count"}
          </div>
        </div>
        <div className="relative mb-1 h-4 min-w-max">
          {monthLabels.map((m) => (
            <span
              key={`${m.label}-${m.index}`}
              className="absolute font-mono text-[10px] text-muted-foreground"
              style={{ left: `${m.index * 16}px` }}
            >
              {m.label}
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          {weeks.map((week, i) => (
            <div key={`w-${i}`} className="grid grid-rows-7 gap-1">
              {week.map((day) => {
                const count = mode === "MERCHANTS" ? day.merchants : day.leads;
                const isPad = day.date.startsWith("pad-");
                return (
                  <div
                    key={day.date}
                    className={`h-3 w-3 rounded-[2px] ${isPad ? "bg-transparent" : levelClass(count)}`}
                    onMouseEnter={() => {
                      if (isPad) return;
                      setHovered({
                        date: day.date,
                        leads: day.leads,
                        merchants: day.merchants,
                      });
                    }}
                    onMouseLeave={() => {
                      if (!isPad) setHovered(null);
                    }}
                    onFocus={() => {
                      if (isPad) return;
                      setHovered({
                        date: day.date,
                        leads: day.leads,
                        merchants: day.merchants,
                      });
                    }}
                    onBlur={() => {
                      if (!isPad) setHovered(null);
                    }}
                    tabIndex={isPad ? -1 : 0}
                    aria-label={isPad ? undefined : `${day.date}: ${day.leads} scouts, ${day.merchants} merchants`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
        <span>Less</span>
        <span className="h-3 w-3 rounded-[2px] bg-muted" />
        <span className="h-3 w-3 rounded-[2px] bg-green-300" />
        <span className="h-3 w-3 rounded-[2px] bg-green-500" />
        <span className="h-3 w-3 rounded-[2px] bg-green-700" />
        <span className="h-3 w-3 rounded-[2px] bg-lime-400 ring-1 ring-lime-200" />
        <span>More</span>
      </div>
    </section>
  );
}
