import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Reminders are timed by Upstash QStash: when a robot is plugged in we ask
// QStash to POST to /api/charging/remind once the charge time is up. Without
// QSTASH_TOKEN (local development) a timer in the dev server does the same.

/** Public address of the site, used for QStash callbacks and email links. */
export function siteUrl() {
  if (process.env.CHARGING_SITE_URL) return process.env.CHARGING_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

export async function scheduleReminder(sessionId: string, delayMs: number) {
  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("QSTASH_TOKEN must be set to send charging reminders.");
    }
    setTimeout(async () => {
      const { sendReminder } = await import("./remind");
      await sendReminder(sessionId);
    }, delayMs);
    return;
  }

  const base = process.env.QSTASH_URL || "https://qstash.upstash.io";
  const res = await fetch(
    `${base}/v2/publish/${siteUrl()}/api/charging/remind`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Upstash-Delay": `${Math.max(1, Math.ceil(delayMs / 1000))}s`,
      },
      body: JSON.stringify({ sessionId }),
    },
  );
  if (!res.ok) {
    throw new Error(`QStash error ${res.status}: ${await res.text()}`);
  }
}

const b64url = (buf: Buffer) => buf.toString("base64url");
const unpad = (s: string) =>
  s.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

/**
 * Checks the Upstash-Signature header: a JWT signed with the current or next
 * QStash signing key, whose `body` claim is the SHA-256 of the request body.
 */
export function verifyQstashSignature(signature: string | null, body: string) {
  if (!signature) return false;
  const [header, payload, sig] = signature.split(".");
  if (!header || !payload || !sig) return false;

  const keys = [
    process.env.QSTASH_CURRENT_SIGNING_KEY,
    process.env.QSTASH_NEXT_SIGNING_KEY,
  ].filter((k): k is string => !!k);

  const signed = keys.some((key) => {
    const expected = Buffer.from(
      b64url(createHmac("sha256", key).update(`${header}.${payload}`).digest()),
    );
    const actual = Buffer.from(sig);
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  });
  if (!signed) return false;

  let claims: { iss?: string; exp?: number; nbf?: number; body?: string };
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return false;
  }
  const now = Math.floor(Date.now() / 1000);
  const bodyHash = b64url(createHash("sha256").update(body).digest());
  return (
    claims.iss === "Upstash" &&
    typeof claims.exp === "number" &&
    claims.exp >= now &&
    (claims.nbf ?? 0) <= now + 60 &&
    unpad(claims.body ?? "") === bodyHash
  );
}
