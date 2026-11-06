"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  BatteryCharging,
  ExternalLink,
  Mail,
  PlugZap,
  Unplug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ALERT, LabScene, type ChargeState } from "./LabScene";
import {
  TARGETS,
  formatDuration,
  formatWhen,
  type ChargeSession,
  type ChargeTarget,
} from "@/lib/charging/robots";
import {
  getSessions,
  startTimer,
  stopTimer,
} from "@/app/(wiki)/charging/actions";

const MIN = 60_000;

function stateOf(
  session: ChargeSession | undefined,
  target: ChargeTarget,
  now: number,
): ChargeState {
  const docked = target.kind === "docked";
  if (!session) return docked ? "docked" : "idle";
  const late = now - session.start > target.targetMinutes * MIN;
  if (docked) return late ? "plug-back" : "in-use";
  return late ? "overdue" : "charging";
}

const STATE_LABEL: Record<ChargeState, string> = {
  idle: "Unplugged",
  charging: "Charging",
  overdue: "Unplug now",
  docked: "On charger",
  "in-use": "Off charger",
  "plug-back": "Plug back in",
};

const ALERT_PILL = "bg-red-500/15 text-red-600 dark:text-red-400";
const STATE_PILL: Record<ChargeState, string> = {
  idle: "bg-muted text-muted-foreground",
  charging: "bg-primary/15 text-primary",
  overdue: ALERT_PILL,
  docked: "bg-green-600/15 text-green-700 dark:text-green-400",
  "in-use": "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "plug-back": ALERT_PILL,
};

const EMAIL_KEY = "charging-email";
const REFRESH_MS = 30_000;

export function ChargingDashboard({
  initialSessions,
}: {
  initialSessions: ChargeSession[];
}) {
  // Rendered client-only (see ChargingClient), so reading the clock here is safe.
  const [now, setNow] = useState(() => Date.now());
  const [sessions, setSessions] = useState(initialSessions);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Open on a robot that's plugged in, if any.
  const [selected, setSelected] = useState(
    () => initialSessions.find((s) => s.end === null)?.robotId ?? TARGETS[0].id,
  );

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    // Pick up plug-ins and unplugs made by other people.
    const refresh = setInterval(
      () => getSessions().then(setSessions, () => {}),
      REFRESH_MS,
    );
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, []);

  const active = useMemo(() => {
    const map: Record<string, ChargeSession> = {};
    for (const s of sessions) if (s.end === null) map[s.robotId] = s;
    return map;
  }, [sessions]);

  const states = useMemo(
    () =>
      Object.fromEntries(
        TARGETS.map((t) => [t.id, stateOf(active[t.id], t, now)]),
      ),
    [active, now],
  );

  const count = (...of: ChargeState[]) =>
    TARGETS.filter((t) => of.includes(states[t.id])).length;
  const charging = count("charging", "overdue");
  const offCharger = count("in-use", "plug-back");
  const alerts = count(...ALERT);

  const run = (action: () => ReturnType<typeof stopTimer>) =>
    startTransition(async () => {
      setError(null);
      try {
        const result = await action();
        setSessions(result.sessions);
        if (result.error) setError(result.error);
      } catch {
        setError("Something went wrong. Check your connection and try again.");
      }
    });

  const target = TARGETS.find((t) => t.id === selected)!;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Charging</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Click a NAO or the Husky when you plug it in, and the wiki emails
            you when it&apos;s time to unplug. The MOVO and UR5 stay plugged in:
            log when you take one off the charger, and you&apos;ll get a
            reminder to plug it back in.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Pill className={STATE_PILL.charging}>{charging} charging</Pill>
          {offCharger > 0 && (
            <Pill className={STATE_PILL["in-use"]}>
              {offCharger} off charger
            </Pill>
          )}
          {alerts > 0 && (
            <Pill className={ALERT_PILL}>{alerts} need action</Pill>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <LabScene
            states={states}
            selected={selected}
            onSelect={setSelected}
          />
          <div className="flex flex-wrap gap-x-5 gap-y-1 border-t px-4 py-2.5 text-xs text-muted-foreground">
            <Legend className="bg-primary" label="Charging" />
            <Legend className="bg-green-600" label="On charger" />
            <Legend className="bg-amber-500" label="Off charger" />
            <Legend className="bg-red-500" label="Needs action" />
            <Legend className="bg-muted-foreground/60" label="Unplugged" />
            <span className="ml-auto hidden sm:inline">
              Click a robot for details
            </span>
          </div>
        </section>

        <DetailPanel
          key={selected}
          target={target}
          state={states[selected]}
          session={active[selected]}
          history={sessions
            .filter((s) => s.robotId === selected && s.end !== null)
            .slice(0, 3)}
          now={now}
          pending={pending}
          error={error}
          onStart={(email) => run(() => startTimer(selected, email))}
          onStop={() => run(() => stopTimer(selected))}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">All robots</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {TARGETS.map((t) => (
            <RobotRow
              key={t.id}
              target={t}
              state={states[t.id]}
              session={active[t.id]}
              now={now}
              selected={selected === t.id}
              onSelect={() => setSelected(t.id)}
            />
          ))}
        </div>
      </section>

      <HistoryTable sessions={sessions} now={now} />
    </div>
  );
}

function Pill({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("rounded-full px-3 py-1 font-medium", className)}>
      {children}
    </span>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", className)} />
      {label}
    </span>
  );
}

function Progress({ value, state }: { value: number; state: ChargeState }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700",
          ALERT.includes(state)
            ? "bg-red-500"
            : state === "in-use"
              ? "bg-amber-500"
              : "bg-primary",
        )}
        style={{ width: `${Math.min(100, value * 100)}%` }}
      />
    </div>
  );
}

function DetailPanel({
  target,
  state,
  session,
  history,
  now,
  pending,
  error,
  onStart,
  onStop,
}: {
  target: ChargeTarget;
  state: ChargeState;
  session: ChargeSession | undefined;
  history: ChargeSession[];
  now: number;
  pending: boolean;
  error: string | null;
  onStart: (email: string) => void;
  onStop: () => void;
}) {
  // Remember the email in this browser so people only type it once.
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem(EMAIL_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const targetMs = target.targetMinutes * MIN;
  const elapsed = session ? now - session.start : 0;
  const docked = target.kind === "docked";
  const late = ALERT.includes(state);

  return (
    <aside className="flex flex-col gap-5 rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide",
              STATE_PILL[state],
            )}
          >
            {STATE_LABEL[state]}
          </span>
          <h2 className="mt-2 text-lg font-semibold leading-snug">
            {target.name}
          </h2>
          <p className="text-xs text-muted-foreground">
            {docked
              ? "Keep plugged in when not in use"
              : `Full charge in about ${formatDuration(targetMs)}`}
          </p>
        </div>
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label="Open robot page"
        >
          <Link href={`/robots/${target.slug}`}>
            <ExternalLink className="size-4" />
          </Link>
        </Button>
      </div>

      {session ? (
        <div className="space-y-3">
          <div>
            <p className="font-mono text-4xl font-semibold tabular-nums tracking-tight">
              {formatDuration(elapsed)}
            </p>
            <p className="text-sm text-muted-foreground">
              {docked
                ? late
                  ? "off the charger. Plug it back in once you're done."
                  : `off the charger. Reminder in ${formatDuration(targetMs - elapsed)}.`
                : late
                  ? `${formatDuration(elapsed - targetMs)} past the ${formatDuration(targetMs)} target`
                  : `${formatDuration(targetMs - elapsed)} left`}
            </p>
          </div>
          <Progress value={elapsed / targetMs} state={state} />
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted-foreground">
              {docked ? "Taken off by" : "Plugged in by"}
            </dt>
            <dd className="truncate">{session.pluggedInBy}</dd>
            <dt className="text-muted-foreground">Started</dt>
            <dd>{formatWhen(session.start, now)}</dd>
          </dl>
          <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <Mail className="mt-0.5 size-3.5 shrink-0" />
            {session.reminders > 0
              ? `Reminder emailed to ${session.pluggedInBy}.`
              : docked
                ? `We'll email ${session.pluggedInBy} if it's still off the charger after ${formatDuration(targetMs)}.`
                : `We'll email ${session.pluggedInBy} when it's time to unplug.`}
          </p>
          <Button
            className="w-full"
            variant={late ? "destructive" : "outline"}
            onClick={onStop}
            disabled={pending}
          >
            {docked ? <PlugZap /> : <Unplug />}
            {docked ? "It's plugged back in" : "Mark as unplugged"}
          </Button>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              localStorage.setItem(EMAIL_KEY, email.trim());
            } catch {}
            onStart(email.trim());
          }}
        >
          <div className="flex items-center gap-3 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
            <BatteryCharging className="size-5 shrink-0" />
            {docked
              ? "On its charger. Taking it off to use it? Enter your email so we can remind you to plug it back in."
              : "Not plugged in. Enter your email so we can remind you to unplug it."}
          </div>
          <Input
            type="email"
            required
            placeholder="you@asu.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Your email"
          />
          <Button
            type="submit"
            className="w-full"
            variant={docked ? "outline" : "default"}
            disabled={pending}
          >
            {docked ? <Unplug /> : <PlugZap />}
            {docked ? "I took it off the charger" : "I plugged it in"}
          </Button>
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {history.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {docked ? "Recent use" : "Recent charges"}
          </h3>
          <ul className="space-y-1.5 text-sm">
            {history.map((s) => (
              <li key={s.id} className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {formatWhen(s.start, now)}
                </span>
                <span className="tabular-nums">
                  {formatDuration(s.end! - s.start)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

function RobotRow({
  target,
  state,
  session,
  now,
  selected,
  onSelect,
}: {
  target: ChargeTarget;
  state: ChargeState;
  session: ChargeSession | undefined;
  now: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const elapsed = session ? now - session.start : 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-col gap-2 rounded-xl border bg-card p-3.5 text-left shadow-sm transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        selected && "border-primary/60 ring-1 ring-primary/30",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{target.name}</span>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
            STATE_PILL[state],
          )}
        >
          {STATE_LABEL[state]}
        </span>
      </div>
      {session ? (
        <>
          <Progress
            value={elapsed / (target.targetMinutes * MIN)}
            state={state}
          />
          <span className="text-xs tabular-nums text-muted-foreground">
            {formatDuration(elapsed)} /{" "}
            {formatDuration(target.targetMinutes * MIN)}
          </span>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">
          {target.kind === "docked"
            ? "Plugged in, as it should be"
            : "Ready to plug in"}
        </span>
      )}
    </button>
  );
}

function HistoryTable({
  sessions,
  now,
}: {
  sessions: ChargeSession[];
  now: number;
}) {
  const names = Object.fromEntries(TARGETS.map((t) => [t.id, t]));
  const sorted = sessions
    .filter((s) => names[s.robotId])
    .sort((a, b) => b.start - a.start);
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">History</h2>
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Robot</th>
              <th className="px-4 py-2.5 font-medium">Logged by</th>
              <th className="px-4 py-2.5 font-medium">Started</th>
              <th className="px-4 py-2.5 font-medium">Duration</th>
              <th className="px-4 py-2.5 font-medium">Reminder</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  Nothing logged yet.
                </td>
              </tr>
            )}
            {sorted.map((s) => {
              const t = names[s.robotId];
              const length = (s.end ?? now) - s.start;
              const over = length > t.targetMinutes * MIN;
              return (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{t.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {t.kind === "docked" ? "Off charger" : "Charge"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {s.pluggedInBy}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {formatWhen(s.start, now)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    <span
                      className={cn(over && "text-red-600 dark:text-red-400")}
                    >
                      {formatDuration(length)}
                    </span>
                    {s.end === null && (
                      <span className="ml-2 text-xs text-primary">ongoing</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {s.reminders ? `${s.reminders} sent` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
