import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getAddedEditor,
  getAdminPassword,
  listAddedEditors,
  saveAdminPassword,
} from "@/lib/editors-store";

// Editors are an allow list of emails with scrypt-hashed passwords, from two
// places:
// - Admins: read from `editors.json` (or WIKI_EDITORS_FILE). Add one with
//   `npm run add-editor`. On hosts without a persistent disk, put the same JSON
//   in WIKI_EDITORS. They're checked first and need no network call, so a Redis
//   outage can't lock them out. That list decides who's an admin; a password
//   they set on the site is kept in Redis and only read at sign-in.
// - Editors added by an admin on the Manage Editors page, kept in Redis (see
//   lib/editors-store.ts).

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

export const SESSION_COOKIE = "wiki_session";
const SESSION_DAYS = 7;

type Editor = { email: string; hash: string };

async function loadEditors(): Promise<Editor[]> {
  if (process.env.WIKI_EDITORS) return JSON.parse(process.env.WIKI_EDITORS);
  const file =
    process.env.WIKI_EDITORS_FILE || path.join(process.cwd(), "editors.json");
  try {
    // turbopackIgnore keeps the build from tracing this runtime path. Without
    // it the tracer copies the whole project, public/ videos included, into
    // proxy.ts's function, past Vercel's 250MB limit.
    return JSON.parse(
      await fs.readFile(/* turbopackIgnore: true */ file, "utf8"),
    );
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function findAdmin(email: string) {
  const normalized = email.trim().toLowerCase();
  return (await loadEditors()).find(
    (e) => e.email.toLowerCase() === normalized,
  );
}

async function findEditor(email: string): Promise<Editor | null> {
  return (
    (await findAdmin(email)) ??
    (await getAddedEditor(email.trim().toLowerCase()))
  );
}

/** An admin's password hash: the one set on the site, unless WIKI_EDITORS changed since. */
async function adminHash(admin: Editor) {
  try {
    const saved = await getAdminPassword(admin.email.toLowerCase());
    return saved?.replaces === admin.hash ? saved.hash : admin.hash;
  } catch {
    // Redis is down: fall back to the WIKI_EDITORS password.
    return admin.hash;
  }
}

export async function setAdminPassword(email: string, password: string) {
  const admin = await findAdmin(email);
  if (!admin) throw new Error(`${email} is not an admin.`);
  await saveAdminPassword(admin.email.toLowerCase(), {
    hash: await hashPassword(password),
    replaces: admin.hash,
  });
}

export async function isAdmin(email: string) {
  return !!(await findAdmin(email));
}

/** Everyone who can sign in, admins first. */
export async function listEditors(): Promise<
  { email: string; admin: boolean; addedBy?: string }[]
> {
  const admins = await loadEditors();
  const adminEmails = new Set(admins.map((e) => e.email.toLowerCase()));
  const added = (await listAddedEditors())
    .filter((e) => !adminEmails.has(e.email))
    .sort((a, b) => a.email.localeCompare(b.email));
  return [
    ...admins
      .map((e) => ({ email: e.email, admin: true }))
      .sort((a, b) => a.email.localeCompare(b.email)),
    ...added.map((e) => ({
      email: e.email,
      admin: false,
      addedBy: e.addedBy,
    })),
  ];
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

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `scrypt:${salt.toString("base64")}:${key.toString("base64")}`;
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
  const admin = await findAdmin(email);
  const editor = admin
    ? { email: admin.email, hash: await adminHash(admin) }
    : await getAddedEditor(email.trim().toLowerCase());
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
  (await cookies()).set(SESSION_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires),
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in editor's email, or null. Removing someone from the allow list revokes access immediately. */
export async function getEditor(): Promise<string | null> {
  return editorFromSession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Checks a session cookie value. Used by getEditor and by proxy.ts, which can't call cookies(). */
export async function editorFromSession(
  value: string | undefined,
): Promise<string | null> {
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

/** Use in pages and server actions only admins may reach. */
export async function requireAdmin(returnTo: string) {
  const email = await requireEditor(returnTo);
  if (!(await isAdmin(email))) redirect("/");
  return email;
}
