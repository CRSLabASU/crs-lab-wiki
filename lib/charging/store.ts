import { randomUUID } from "node:crypto";
import type { ChargeSession } from "./robots";

// Charging sessions live in Upstash Redis, called over its REST API. Without
// Redis credentials (local development) they're kept in memory instead, and
// are lost when the dev server restarts.
//
// Keys:
//   charging:session:<id>  JSON of one ChargeSession
//   charging:history       sorted set of session ids, scored by start time
//   charging:active        hash of robotId -> id of its open session
//   charging:reminders     hash of session id -> reminders sent (kept apart
//                          so a reminder can't overwrite an unplug)

const HISTORY_LIMIT = 50;

// Read the environment on each call (see lib/content.ts). The Vercel
// Marketplace integration names them KV_*; a direct Upstash setup UPSTASH_*.
function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function redis(commands: (string | number)[][]): Promise<unknown[]> {
  const config = redisConfig()!;
  const res = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}` },
    body: JSON.stringify(commands),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash Redis error ${res.status}`);
  const results = (await res.json()) as { result?: unknown; error?: string }[];
  const failed = results.find((r) => r.error);
  if (failed) throw new Error(`Upstash Redis error: ${failed.error}`);
  return results.map((r) => r.result);
}

const sessionKey = (id: string) => `charging:session:${id}`;

// In-memory fallback, kept on globalThis so it survives hot reloads.
const memory = ((
  globalThis as { __charging?: Map<string, ChargeSession> }
).__charging ??= new Map<string, ChargeSession>());

export async function listSessions(): Promise<ChargeSession[]> {
  if (!redisConfig()) {
    return [...memory.values()]
      .sort((a, b) => b.start - a.start)
      .slice(0, HISTORY_LIMIT);
  }
  const [ids] = (await redis([
    ["ZRANGE", "charging:history", 0, HISTORY_LIMIT - 1, "REV"],
  ])) as string[][];
  if (!ids.length) return [];
  const [values, counts] = (await redis([
    ["MGET", ...ids.map(sessionKey)],
    ["HMGET", "charging:reminders", ...ids],
  ])) as (string | null)[][];
  return values.flatMap((v, i) =>
    v ? [{ ...JSON.parse(v), reminders: Number(counts[i] ?? 0) }] : [],
  );
}

export async function getSession(id: string): Promise<ChargeSession | null> {
  if (!redisConfig()) return memory.get(id) ?? null;
  const [value, count] = (await redis([
    ["GET", sessionKey(id)],
    ["HGET", "charging:reminders", id],
  ])) as (string | null)[];
  return value ? { ...JSON.parse(value), reminders: Number(count ?? 0) } : null;
}

async function saveSession(session: ChargeSession) {
  if (!redisConfig()) {
    memory.set(session.id, session);
    return;
  }
  await redis([["SET", sessionKey(session.id), JSON.stringify(session)]]);
}

/** Starts a session, or returns null if the robot is already plugged in. */
export async function startSession(
  robotId: string,
  pluggedInBy: string,
): Promise<ChargeSession | null> {
  const session: ChargeSession = {
    id: randomUUID(),
    robotId,
    pluggedInBy,
    start: Date.now(),
    end: null,
    reminders: 0,
  };

  if (!redisConfig()) {
    const open = [...memory.values()].some(
      (s) => s.robotId === robotId && s.end === null,
    );
    if (open) return null;
    memory.set(session.id, session);
    return session;
  }

  // HSETNX claims the robot atomically, so two people can't both plug it in.
  const [claimed] = await redis([
    ["HSETNX", "charging:active", robotId, session.id],
  ]);
  if (claimed !== 1) return null;
  await redis([
    ["SET", sessionKey(session.id), JSON.stringify(session)],
    ["ZADD", "charging:history", session.start, session.id],
    // Keep the newest sessions only. Old ones drop off the history.
    ["ZREMRANGEBYRANK", "charging:history", 0, -(HISTORY_LIMIT * 4) - 1],
  ]);
  return session;
}

/** Ends a session. Returns false if it was already ended. */
export async function endSession(id: string): Promise<boolean> {
  const session = await getSession(id);
  if (!session || session.end !== null) return false;
  await saveSession({ ...session, end: Date.now() });
  if (redisConfig()) {
    // Only clear the claim if it still points at this session.
    const [current] = await redis([
      ["HGET", "charging:active", session.robotId],
    ]);
    if (current === id) {
      await redis([["HDEL", "charging:active", session.robotId]]);
    }
  }
  return true;
}

export async function activeSessionId(robotId: string) {
  if (!redisConfig()) {
    return (
      [...memory.values()].find((s) => s.robotId === robotId && s.end === null)
        ?.id ?? null
    );
  }
  const [id] = (await redis([["HGET", "charging:active", robotId]])) as (
    | string
    | null
  )[];
  return id;
}

export async function recordReminder(id: string) {
  if (!redisConfig()) {
    const session = memory.get(id);
    if (session) session.reminders += 1;
    return;
  }
  await redis([["HINCRBY", "charging:reminders", id, 1]]);
}
