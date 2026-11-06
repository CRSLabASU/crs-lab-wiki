import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

// All wiki page storage lives here. Every save is a git commit, which powers
// history and restore. Two backends, picked automatically:
//
// - "github": commits through the GitHub API. Used when GITHUB_TOKEN is set
//   (required on Vercel, where the filesystem is read-only and there's no .git).
//   Vercel redeploys on each commit, so saved changes go live after the deploy.
// - "local": writes files and runs git in this checkout. Used for local
//   development and long-running servers; changes show up immediately.

// Read the environment on each call, never once at module load: the module can
// be evaluated during the build, before the runtime environment exists.
function githubConfig() {
  return {
    token: process.env.GITHUB_TOKEN,
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
    branch: process.env.GITHUB_BRANCH || "main",
  };
}

export function backend(): "github" | "local" {
  return githubConfig().token ? "github" : "local";
}

/** True when saved changes only appear on the site after a redeploy. */
export function savesNeedRedeploy() {
  return backend() === "github";
}

// Page history only shows commits from this date on (midnight, server time;
// Vercel servers run in UTC).
export const HISTORY_START = "2026-05-15";

const REPO_ROOT = process.cwd();
const exec = promisify(execFile);

export type Revision = {
  sha: string;
  authorName: string;
  authorEmail: string;
  date: string;
  message: string;
  patch?: string;
};

export function isValidSlug(slug: string) {
  return /^[a-z0-9_-]+$/.test(slug);
}

function pagePath(slug: string) {
  if (!isValidSlug(slug)) throw new Error("Invalid slug");
  return `content/robots/${slug}/page.mdx`;
}

function conflictError() {
  return new Error(
    "This page was changed by someone else since you opened it. Copy your edits, reload, and try again.",
  );
}

// -- GitHub backend --

async function github(apiPath: string, init: RequestInit = {}) {
  const { token, owner, repo } = githubConfig();
  if (!owner || !repo) {
    throw new Error("Set GITHUB_OWNER and GITHUB_REPO to save through GitHub.");
  }
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}${apiPath}`,
    {
      ...init,
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...init.headers,
      },
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw Object.assign(
      new Error(`GitHub API error ${res.status}: ${body.slice(0, 300)}`),
      { status: res.status, body },
    );
  }
  return res.json();
}

async function githubReadFile(file: string, ref: string) {
  const data = await github(`/contents/${file}?ref=${encodeURIComponent(ref)}`);
  return {
    content: Buffer.from(data.content, "base64").toString("utf8"),
    sha: data.sha as string,
  };
}

async function githubSave(opts: SaveOptions) {
  const { branch } = githubConfig();
  const file = pagePath(opts.slug);
  let sha = opts.baseVersion;
  if (!sha) {
    const current = await githubReadFile(file, branch);
    if (current.content === opts.content) return current.sha;
    sha = current.sha;
  }

  const author = {
    name: authorName(opts.authorEmail),
    email: opts.authorEmail,
  };
  try {
    const result = await github(`/contents/${file}`, {
      method: "PUT",
      body: JSON.stringify({
        message: opts.message,
        content: Buffer.from(opts.content, "utf8").toString("base64"),
        sha,
        branch,
        author,
        committer: author,
      }),
    });
    return result.content.sha as string;
  } catch (err) {
    const { status, body } = err as { status?: number; body?: string };
    if (status === 409 || (status === 422 && /match/i.test(body ?? ""))) {
      throw conflictError();
    }
    throw err;
  }
}

async function githubRevisions(slug: string, limit: number) {
  const { branch } = githubConfig();
  const file = pagePath(slug);
  const since = new Date(`${HISTORY_START}T00:00:00`).toISOString();
  const commits: Array<{
    sha: string;
    commit: {
      message: string;
      author: { name: string; email: string; date: string };
    };
  }> = await github(
    `/commits?path=${file}&sha=${encodeURIComponent(branch)}&since=${since}&per_page=${limit}`,
  );

  // The list endpoint has no diffs, so fetch each commit's patch in parallel.
  return Promise.all(
    commits.map(async (c): Promise<Revision> => {
      const detail = await github(`/commits/${c.sha}`);
      const changed = (
        detail.files as Array<{ filename: string; patch?: string }>
      )?.find((f) => f.filename === file);
      return {
        sha: c.sha,
        authorName: c.commit.author.name,
        authorEmail: c.commit.author.email,
        date: c.commit.author.date,
        message: c.commit.message.split("\n")[0],
        patch: changed?.patch,
      };
    }),
  );
}

// -- Local git backend --

async function git(args: string[], env?: Record<string, string>) {
  const { stdout } = await exec("git", args, {
    cwd: REPO_ROOT,
    env: { ...process.env, ...env },
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}

function contentVersion(content: string) {
  return createHash("sha1").update(content).digest("hex");
}

function assertWritableHost() {
  if (process.env.VERCEL) {
    // Only names are reported, never values.
    const missing = ["GITHUB_TOKEN", "GITHUB_OWNER", "GITHUB_REPO"].filter(
      (name) => !process.env[name],
    );
    const environment = process.env.VERCEL_ENV ?? "unknown";
    const branch = process.env.VERCEL_GIT_COMMIT_REF ?? "unknown";
    throw new Error(
      `Editing and history on Vercel need the GitHub backend, but this deployment can't see: ${missing.join(", ")}.\n` +
        `This is a "${environment}" deployment of branch "${branch}". Add the variables to the ${environment} environment in Vercel (Settings → Environment Variables), then redeploy this deployment.`,
    );
  }
}

// Serialize writes so concurrent saves never race on the git index lock.
let writeQueue: Promise<unknown> = Promise.resolve();

function localSave(opts: SaveOptions) {
  const run = async () => {
    assertWritableHost();
    const file = pagePath(opts.slug);
    const current = await fs.readFile(path.join(REPO_ROOT, file), "utf8");
    if (opts.baseVersion && contentVersion(current) !== opts.baseVersion) {
      throw conflictError();
    }
    if (current !== opts.content) {
      await fs.writeFile(path.join(REPO_ROOT, file), opts.content, "utf8");
      const name = authorName(opts.authorEmail);
      const env = {
        GIT_AUTHOR_NAME: name,
        GIT_AUTHOR_EMAIL: opts.authorEmail,
        GIT_COMMITTER_NAME: name,
        GIT_COMMITTER_EMAIL: opts.authorEmail,
      };
      await git(["add", "--", file], env);
      await git(["commit", "-m", opts.message, "--", file], env);
    }
    return contentVersion(opts.content);
  };
  const result = writeQueue.then(run, run);
  writeQueue = result.catch(() => {});
  return result;
}

async function localRevisions(slug: string, limit: number) {
  const out = await git([
    "log",
    `--max-count=${limit}`,
    // Keep the time: with a bare date git uses the current time of day.
    `--since=${HISTORY_START} 00:00`,
    "--no-color",
    "--no-ext-diff",
    "--unified=3",
    "--format=%x1e%H%x1f%an%x1f%ae%x1f%aI%x1f%s",
    "-p",
    "--",
    pagePath(slug),
  ]);

  return out
    .split("\x1e")
    .filter(Boolean)
    .map((record): Revision => {
      const newline = record.indexOf("\n");
      const header = newline === -1 ? record : record.slice(0, newline);
      const body = newline === -1 ? "" : record.slice(newline);
      const [sha, authorName, authorEmail, date, message] =
        header.split("\x1f");
      // Drop the "diff --git" preamble and keep just the hunks.
      const hunks = body.indexOf("@@");
      const patch = hunks === -1 ? undefined : body.slice(hunks).trim();
      return { sha, authorName, authorEmail, date, message, patch };
    });
}

// -- Public API --

type SaveOptions = {
  slug: string;
  content: string;
  message: string;
  authorEmail: string;
  /** If given, the save is rejected when the page changed since this version. */
  baseVersion?: string;
};

function authorName(email: string) {
  return email.split("@")[0];
}

/** The latest page content and a version token for conflict detection. */
export async function readPage(slug: string) {
  if (backend() === "github") {
    const { content, sha } = await githubReadFile(
      pagePath(slug),
      githubConfig().branch,
    );
    return { content, version: sha };
  }
  const content = await fs.readFile(
    path.join(REPO_ROOT, pagePath(slug)),
    "utf8",
  );
  return { content, version: contentVersion(content) };
}

export async function readPageAt(slug: string, sha: string) {
  if (!/^[0-9a-f]{7,40}$/.test(sha)) throw new Error("Invalid revision");
  if (backend() === "github") {
    return (await githubReadFile(pagePath(slug), sha)).content;
  }
  return git(["show", `${sha}:${pagePath(slug)}`]);
}

/** Saves the page as a commit and returns the new version token. */
export function savePage(opts: SaveOptions): Promise<string> {
  return backend() === "github" ? githubSave(opts) : localSave(opts);
}

/** Recent revisions of a page (since HISTORY_START) with their diffs. */
export async function listRevisions(slug: string, limit = 20) {
  if (backend() === "github") return githubRevisions(slug, limit);
  assertWritableHost();
  return localRevisions(slug, limit);
}
