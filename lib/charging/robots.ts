// Robots on the charging page and when each one's reminder goes out. Shared by
// the page and the server.
//
// Battery robots (the NAOs, Husky) charge for a while and then get unplugged,
// so the timer runs while they're plugged in. Docked robots (the MOVO, UR5)
// should stay plugged in whenever nobody's using them, so the timer runs while
// they're off the charger and the reminder asks to plug them back in.

export type ChargeTarget = {
  id: string;
  name: string;
  /** Robot page slug, for the "Open robot page" link. */
  slug: string;
  /**
   * Battery: how long a charge takes before the unplug reminder.
   * Docked: how long it can be off the charger before the plug-back-in reminder.
   */
  targetMinutes: number;
  kind: "battery" | "docked";
};

export type ChargeSession = {
  id: string;
  robotId: string;
  /** Who started the timer. They get the reminder emails. */
  pluggedInBy: string;
  start: number;
  /** Null while the timer is running. */
  end: number | null;
  /** How many reminders have been emailed. */
  reminders: number;
};

// Times are placeholders until the lab confirms them.
export const TARGETS: ChargeTarget[] = [
  {
    id: "nao-jimmy",
    name: "NAO · Jimmy",
    slug: "nao",
    targetMinutes: 120,
    kind: "battery",
  },
  {
    id: "nao-yoda",
    name: "NAO · Yoda",
    slug: "nao",
    targetMinutes: 120,
    kind: "battery",
  },
  {
    id: "nao-bran",
    name: "NAO · Bran",
    slug: "nao",
    targetMinutes: 120,
    kind: "battery",
  },
  {
    id: "nao-echo",
    name: "NAO · Echo",
    slug: "nao",
    targetMinutes: 120,
    kind: "battery",
  },
  {
    id: "husky",
    name: "Clearpath Husky A200",
    slug: "clearpath_husky_a200",
    targetMinutes: 600,
    kind: "battery",
  },
  {
    id: "movo",
    name: "Kinova MOVO",
    slug: "kinova_movo",
    targetMinutes: 120,
    kind: "docked",
  },
  {
    id: "ur5",
    name: "UR5 with Robotiq Gripper",
    slug: "ur5",
    targetMinutes: 120,
    kind: "docked",
  },
];

export function findTarget(id: string) {
  return TARGETS.find((t) => t.id === id);
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function formatDuration(ms: number) {
  const totalMin = Math.max(0, Math.floor(ms / MIN));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h ? `${h}h ${m.toString().padStart(2, "0")}m` : `${m}m`;
}

export function formatWhen(ts: number, now: number) {
  const diff = now - ts;
  if (diff < HOUR) return `${Math.max(1, Math.round(diff / MIN))} min ago`;
  if (diff < DAY) return `${Math.round(diff / HOUR)} h ago`;
  return new Date(ts).toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
