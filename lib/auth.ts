import { createHmac, scrypt, timingSafeEqual } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Editors are an allow list of emails with scrypt-hashed passwords, read from
// `editors.json` (or WIKI_EDITORS_FILE). Add one with `npm run add-editor`.
// On hosts without a persistent disk, put the same JSON in WIKI_EDITORS.

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const COOKIE = "wiki_session";
const SESSION_DAYS = 7;

type Editor = { email: string; hash: string };

async function loadEditors(): Promise<Editor[]> {
  if (process.env.WIKI_EDITORS) return JSON.parse(process.env.WIKI_EDITORS);
  const file =
    process.env.WIKI_EDITORS_FILE || path.join(process.cwd(), "editors.json");
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function findEditor(email: string) {
  const normalized = email.trim().toLowerCase();
  return (await loadEditors()).find(
    (e) => e.email.toLowerCase() === normalized,
  );
}

/** Hash format: `scrypt:<salt base64>:<key base64>` (matches scripts/add-editor.mjs). */
async function verifyPassword(password: string, stored: string) {
  const [algo, salt, key] = stored.split(":");
  if (algo !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "base64");
  const actual = await scryptAsync(
    password,
    Buffer.from(salt, "base64"),
    expected.length,
  );
  return timingSafeEqual(actual, expected);
}

function secret() {
  const s = process.env.WIKI_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "WIKI_SESSION_SECRET must be set to a random string of at least 32 characters.",
    );
  }
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export async function checkCredentials(email: string, password: string) {
  const editor = await findEditor(email);
  // Still hash when the email is unknown so response time doesn't reveal the allow list.
  const ok = await verifyPassword(
    password,
    editor?.hash ?? `scrypt:${"A".repeat(24)}:${"A".repeat(88)}`,
  );
  return ok && editor ? editor.email : null;
}

export async function startSession(email: string) {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ email, expires })).toString(
    "base64url",
  );
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires),
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/** The signed-in editor's email, or null. Removing someone from the allow list revokes access immediately. */
export async function getEditor(): Promise<string | null> {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return null;

  const { email, expires } = JSON.parse(
    Buffer.from(payload, "base64url").toString(),
  );
  if (typeof expires !== "number" || expires < Date.now()) return null;
  return (await findEditor(email))?.email ?? null;
}

/** Use in pages and server actions that need an editor; redirects to login otherwise. */
export async function requireEditor(returnTo: string) {
  const email = await getEditor();
  if (!email) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return email;
}
