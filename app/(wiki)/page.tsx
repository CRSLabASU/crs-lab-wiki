import Link from "next/link";
import { getAllRobotsMeta, type RobotMeta } from "@/lib/robots/loader";
import { listSessions } from "@/lib/charging/store";
import { findTarget, formatDuration } from "@/lib/charging/robots";
import { cn, formatDate, statusColors, statusLabels } from "@/lib/utils";

// Charging changes minute to minute, so render on each visit.
export const dynamic = "force-dynamic";

const STATUS_ORDER = [
  "OPERATIONAL",
  "DEGRADED",
  "UNDER ASSESSMENT",
  "MAINTENANCE",
  "BROKEN",
  "DOWN",
];

const howTo = [
  {
    title: "Edit a page",
    body: "Open a robot and click Edit. Pages are MDX, and each ## heading becomes a sidebar link.",
  },
  {
    title: "Log repairs",
    body: "Add a RepairEntry for every fix you try, including the ones that didn't work.",
  },
  {
    title: "Check history",
    body: "Every save is kept. Use History on a robot page to compare versions or restore one.",
  },
];

type Attention = {
  robot: RobotMeta;
  reasons: { label: string; status: string; note?: string }[];
};

/** Robots that aren't operational, or have units that aren't. */
function needsAttention(robots: RobotMeta[]): Attention[] {
  return robots.flatMap((robot) => {
    const reasons = [];
    if (robot.status !== "OPERATIONAL") {
      reasons.push({ label: robot.name, status: robot.status });
    }
    for (const unit of robot.units ?? []) {
      if (unit.status !== "OPERATIONAL") {
        reasons.push({
          label: unit.nickname,
          status: unit.status,
          note: unit.note,
        });
      }
    }
    return reasons.length ? [{ robot, reasons }] : [];
  });
}

async function chargingNow() {
  try {
    const now = Date.now();
    return (await listSessions())
      .filter((s) => s.end === null)
      .flatMap((s) => {
        const target = findTarget(s.robotId);
        if (!target) return [];
        const elapsed = now - s.start;
        return [
          {
            id: s.id,
            name: target.name,
            docked: target.kind === "docked",
            elapsed,
            overdue: elapsed > target.targetMinutes * 60_000,
          },
        ];
      });
  } catch (err) {
    console.error(err);
    return null;
  }
}

export default async function HomePage() {
  const robots = getAllRobotsMeta();
  const attention = needsAttention(robots);
  const charging = await chargingNow();

  const unitCount = robots.reduce((n, r) => n + (r.units?.length || 1), 0);
  const counts = STATUS_ORDER.map((status) => ({
    status,
    count: robots.filter((r) => r.status === status).length,
  })).filter((c) => c.count > 0);

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          CRS Robot Wiki
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Specs, setup guides, diagnostics and repair logs for the robots in the
          Cooperative Robotic Systems Lab. Pick a robot from the sidebar, or see
          them all in the{" "}
          <Link href="/robots" className="text-primary hover:underline">
            fleet register
          </Link>
          .
        </p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span>
            {robots.length} robots, {unitCount} units
          </span>
          {counts.map((c) => (
            <span key={c.status} className="flex items-center gap-1.5">
              <span
                className={cn("size-2 rounded-full", statusColors[c.status])}
              />
              {c.count} {(statusLabels[c.status] ?? c.status).toLowerCase()}
            </span>
          ))}
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section>
          <SectionHeading
            title="Needs attention"
            meta={`${attention.length} of ${robots.length} robots`}
          />
          {attention.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Every robot is operational.
            </p>
          ) : (
            <ul className="divide-y">
              {attention.map(({ robot, reasons }) => (
                <li key={robot.slug}>
                  <Link
                    href={`/robots/${robot.slug}`}
                    className="group -mx-3 block rounded-md px-3 py-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <span className="font-medium group-hover:text-primary">
                        {robot.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {robot.lastChecked
                          ? `Checked ${formatDate(robot.lastChecked)}`
                          : "Never checked"}
                      </span>
                    </div>
                    <ul className="mt-1.5 space-y-1">
                      {reasons.map((r) => (
                        <li
                          key={r.label}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span
                            className={cn(
                              "mt-1.5 size-2 shrink-0 rounded-full",
                              statusColors[r.status] ?? "bg-muted-foreground",
                            )}
                          />
                          <span className="text-muted-foreground">
                            {r.label !== robot.name && (
                              <span className="text-foreground">
                                {r.label}:{" "}
                              </span>
                            )}
                            {statusLabels[r.status] ?? r.status.toLowerCase()}
                            {r.note && ` · ${r.note}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-10">
          <section>
            <SectionHeading
              title="Charging now"
              action={
                <Link
                  href="/charging"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Open
                </Link>
              }
            />
            {charging === null ? (
              <p className="py-3 text-sm text-muted-foreground">
                Couldn&apos;t load charging status.
              </p>
            ) : charging.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">
                Nothing is charging, and the MOVO and UR5 are on their chargers.
              </p>
            ) : (
              <ul className="divide-y text-sm">
                {charging.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <span className="min-w-0 truncate">
                      {c.name}
                      {c.docked && (
                        <span className="text-muted-foreground">
                          {" "}
                          · off charger
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 tabular-nums",
                        c.overdue
                          ? "font-medium text-red-600 dark:text-red-400"
                          : "text-muted-foreground",
                      )}
                    >
                      {formatDuration(c.elapsed)}
                      {c.overdue && (c.docked ? " · plug in" : " · unplug")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <SectionHeading title="Using the wiki" />
            <ul className="space-y-3 pt-2 text-sm">
              {howTo.map(({ title, body }) => (
                <li key={title}>
                  <span className="font-medium">{title}.</span>{" "}
                  <span className="text-muted-foreground">{body}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-1 flex items-baseline justify-between gap-3 border-b pb-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {meta && <span className="text-sm text-muted-foreground">{meta}</span>}
      {action}
    </div>
  );
}
