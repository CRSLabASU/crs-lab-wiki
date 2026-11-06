import { redis, redisConfig } from "@/lib/redis";

// Editors added from the Manage Editors page live in Upstash Redis, so adding
// one needs no redeploy. Without Redis credentials (local development) only
// the WIKI_EDITORS / editors.json list exists (see lib/auth.ts).
//
// Keys:
//   wiki:editors          hash of lowercase email -> JSON of one AddedEditor
//   wiki:admin-passwords  hash of lowercase email -> JSON of one AdminPassword

const KEY = "wiki:editors";
const ADMIN_PASSWORDS_KEY = "wiki:admin-passwords";

export type AddedEditor = {
  email: string;
  hash: string;
  addedBy: string;
  addedAt: number;
};

/** A password set on the site for an admin listed in WIKI_EDITORS. */
export type AdminPassword = {
  hash: string;
  /** The WIKI_EDITORS hash this overrides. If that changes, this is ignored. */
  replaces: string;
};

export function canAddEditors() {
  return !!redisConfig();
}

export async function getAddedEditor(
  email: string,
): Promise<AddedEditor | null> {
  if (!redisConfig()) return null;
  const [value] = (await redis([["HGET", KEY, email]])) as (string | null)[];
  return value ? JSON.parse(value) : null;
}

export async function listAddedEditors(): Promise<AddedEditor[]> {
  if (!redisConfig()) return [];
  // HGETALL comes back flat: field, value, field, value, ...
  const [flat] = (await redis([["HGETALL", KEY]])) as string[][];
  return flat.flatMap((value, i) => (i % 2 ? [JSON.parse(value)] : []));
}

export async function saveAddedEditor(editor: AddedEditor) {
  await redis([["HSET", KEY, editor.email, JSON.stringify(editor)]]);
}

export async function removeAddedEditor(email: string) {
  await redis([["HDEL", KEY, email]]);
}

export async function getAdminPassword(
  email: string,
): Promise<AdminPassword | null> {
  if (!redisConfig()) return null;
  const [value] = (await redis([["HGET", ADMIN_PASSWORDS_KEY, email]])) as (
    | string
    | null
  )[];
  return value ? JSON.parse(value) : null;
}

export async function saveAdminPassword(
  email: string,
  password: AdminPassword,
) {
  await redis([["HSET", ADMIN_PASSWORDS_KEY, email, JSON.stringify(password)]]);
}
