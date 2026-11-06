"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Bot, ChevronRight, Search } from "lucide-react";
import type { RobotMeta } from "@/lib/robots/loader";
import { Input } from "@/components/ui/input";
import { cn, formatDate, statusColors, statusLabels } from "@/lib/utils";

function Dot({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "size-2 shrink-0 rounded-full",
        statusColors[status] ?? "bg-muted-foreground",
        className,
      )}
    />
  );
}

function label(status: string) {
  return statusLabels[status] ?? status.toLowerCase();
}

export function FleetRegister({ robots }: { robots: RobotMeta[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const statuses = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of robots)
      counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
    return [...counts.entries()];
  }, [robots]);

  const shown = robots.filter((r) => {
    if (status && r.status !== status) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [
      r.name,
      r.nickname,
      r.platform,
      ...(r.units ?? []).map((u) => u.nickname),
    ]
      .filter(Boolean)
      .some((text) => text!.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search robots or units"
            aria-label="Search robots or units"
            className="pl-9"
          />
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filter by status"
        >
          <FilterChip active={status === null} onClick={() => setStatus(null)}>
            All{" "}
            <span className="tabular-nums text-muted-foreground">
              {robots.length}
            </span>
          </FilterChip>
          {statuses.map(([s, n]) => (
            <FilterChip
              key={s}
              active={status === s}
              onClick={() => setStatus(status === s ? null : s)}
            >
              <Dot status={s} />
              {label(s)}{" "}
              <span className="tabular-nums text-muted-foreground">{n}</span>
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)_20px] gap-4 border-b bg-muted/30 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:grid">
          <span>Robot</span>
          <span>Status</span>
          <span>Units</span>
          <span>Last checked</span>
          <span />
        </div>

        {shown.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No robots match.
          </p>
        ) : (
          <ul className="divide-y">
            {shown.map((robot) => (
              <li key={robot.slug}>
                <RobotRow robot={robot} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        active
          ? "border-primary/50 bg-primary/10 text-foreground"
          : "bg-card hover:bg-muted/50",
      )}
    >
      {children}
    </button>
  );
}

function RobotRow({ robot }: { robot: RobotMeta }) {
  const {
    slug,
    name,
    nickname,
    platform,
    status,
    thumbnail,
    units,
    lastChecked,
    location,
  } = robot;

  return (
    <Link
      href={`/robots/${slug}`}
      className="group grid grid-cols-[minmax(0,1fr)_20px] items-center gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)_20px]"
    >
      {/* Robot */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border bg-muted">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt=""
              fill
              sizes="48px"
              className="object-cover object-top"
            />
          ) : (
            <Bot
              className="absolute inset-0 m-auto size-5 text-muted-foreground"
              strokeWidth={1.5}
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium group-hover:text-primary">
            {name}
            {nickname && (
              <span className="font-normal text-muted-foreground">
                {" "}
                · “{nickname}”
              </span>
            )}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {[platform, location].filter(Boolean).join(" · ") ||
              "No details yet"}
          </p>
        </div>
      </div>

      <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 lg:order-last" />

      {/* Status, units, last checked: one wrapped line on small screens, columns on large */}
      <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm lg:contents">
        <span className="flex items-center gap-2">
          <Dot status={status} />
          {label(status)}
        </span>

        <div className="flex min-w-0 flex-wrap gap-1.5">
          {units?.length ? (
            units.map((u) => (
              <span
                key={u.nickname}
                title={[label(u.status), u.note].filter(Boolean).join(" · ")}
                className="flex items-center gap-1.5 rounded-md border bg-background/60 px-2 py-0.5 text-xs"
              >
                <Dot status={u.status} className="size-1.5" />
                {u.nickname}
              </span>
            ))
          ) : (
            <span className="text-muted-foreground lg:text-xs">1 unit</span>
          )}
        </div>

        <span className={cn("text-muted-foreground", !lastChecked && "italic")}>
          {lastChecked ? (
            <>
              <span className="lg:hidden">Checked </span>
              {formatDate(lastChecked)}
            </>
          ) : (
            "Not checked yet"
          )}
        </span>
      </div>
    </Link>
  );
}
