# CRS Lab Wiki

A Next.js wiki for the Cooperative Robotic Systems (CRS) Lab: documentation,
diagnostics and repair notes for every robot in the lab.

## Getting Started

Run all commands from inside the `crs-robot-wiki` folder:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> Starting the dev server from a parent folder (for example `~/Developer`) fails
> with `Can't resolve 'tailwindcss'`, because Tailwind and the content loader
> look for files relative to the folder the server was started from.

To browse the wiki you only need `npm run dev`. To **edit pages in the browser**,
see [Local development with editing](#local-development-with-editing). The live
site runs on Vercel — see [Deploying on Vercel](#deploying-on-vercel).

## What changed (September 2026)

### Editing, history and sign-in

- **Sign-in with an allow list.** Only approved emails can edit or restore pages.
  Passwords are stored as scrypt hashes. The old shared `WIKI_USER`/`WIKI_PASS`
  basic auth is gone.
- **Saves are git commits.** On Vercel, edits are committed to GitHub through the
  API with the editor's email as the author, and Vercel redeploys the site. In
  local development without a GitHub token, edits are committed to your local
  checkout instead.
- **Simpler edit flow.** Saving and restoring use server actions instead of API
  routes. The page is checked for valid MDX before it's saved, and a save is
  rejected if someone else changed the page while you were editing.
- **Redesigned editor** with line numbers, a wrap toggle, an unsaved-changes
  indicator and built-in formatting help.
- **History** only shows edits from `HISTORY_START` onward (see [Page history](#page-history)).

### Performance

- Robot pages are pre-rendered at build time instead of compiling MDX on every
  visit.
- Removed unused dependencies (`@next/mdx`, `js-yaml`) and the deprecated
  middleware file.

### Design

- New home page with fleet stats, robot cards and a short guide to the wiki.
- Redesigned robot cards with a larger photo, status badge, platform and summary.
- Robot pages open with a single header card (photo, status, summary, location,
  last checked, maintainers, History/Edit buttons) and link cards for
  documentation and downloads.
- Fixed the monospace font, layouts on phones and a light/dark toggle hydration
  error.

### New robots

- Clearpath Husky A200
- UR5 with Gripper
- Freenove Big Hexapod

These pages are marked `UNDER ASSESSMENT`. Lab-specific details that still need
confirming are marked _TBD_, and they don't have photos yet.

## Deploying on Vercel

Vercel's servers can't write files and don't include git history, so the wiki
saves edits by committing to GitHub. Each commit triggers a Vercel redeploy, and
the edited page goes live when that deploy finishes (usually a minute or two).

### 1. Create a GitHub token

Create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new):

- **Repository access:** Only select repositories → `crs-robot-wiki`
- **Permissions:** Contents → **Read and write**

### 2. Add environment variables in Vercel

In the Vercel project, go to **Settings → Environment Variables** and add these
for the Production environment:

| Variable              | Value                                                        |
| --------------------- | ------------------------------------------------------------ |
| `GITHUB_TOKEN`        | The token from step 1                                        |
| `GITHUB_OWNER`        | `AliKefel`                                                   |
| `GITHUB_REPO`         | `crs-robot-wiki`                                             |
| `GITHUB_BRANCH`       | The branch Vercel deploys to production (usually `main`)     |
| `WIKI_SESSION_SECRET` | Output of `openssl rand -hex 32`                             |
| `WIKI_EDITORS`        | Output of `npm run -s editors:env` (see [Editors](#editors)) |

Then redeploy. Environment variable changes only apply to new deployments.

`GITHUB_BRANCH` must be the branch Vercel deploys, or saves won't show up on
the site.

### What editors see

- Saving keeps you in the editor with a "Saved" message. The change shows up in
  the page's History right away and on the live page after the redeploy.
- Every save or restore creates one commit and one Vercel deployment. CI also
  runs on each commit to `main`.
- Run `git pull` locally before editing content files by hand, since the site
  commits to the same branch.

## Editors

Editors are an allow list of emails with hashed passwords. You manage the list
on your own machine with `npm run add-editor`, which writes `editors.json`
(gitignored), then copy it into Vercel.

### Add an editor

```bash
npm run add-editor -- someone@asu.edu
```

The script asks for a password twice (at least 8 characters; typing isn't
shown). Emails are case-insensitive. There's no self sign-up: you choose the
password and share it with the new editor.

Then publish the updated list to Vercel:

1. Run `npm run -s editors:env` and copy the one-line output
2. In Vercel, set `WIKI_EDITORS` to that value (Settings → Environment Variables)
3. Redeploy

With the [Vercel CLI](https://vercel.com/docs/cli), the same steps are:

```bash
npm run -s editors:env | vercel env add WIKI_EDITORS production --force
```

Then redeploy from the Vercel dashboard (**Deployments** → latest production
deployment → **⋯** → **Redeploy**).

Keep your local `editors.json` safe. It's the source you edit and copy from, and
it isn't stored anywhere else except inside the Vercel variable.

### Change a password

Run the same command with the editor's existing email, enter the new password,
then update `WIKI_EDITORS` in Vercel and redeploy:

```bash
npm run add-editor -- someone@asu.edu
```

The old password stops working once the new deployment is live. Editors can't
change their own password from the site, so this is also how to reset a
forgotten one.

> Changing a password does **not** sign out sessions that are already signed in
> (sessions last 7 days). To sign everyone out, see below.

### Remove an editor

Delete their entry from `editors.json`, then update `WIKI_EDITORS` in Vercel and
redeploy:

```json
[
  { "email": "ali@asu.edu", "hash": "scrypt:...:..." },
  { "email": "someone@asu.edu", "hash": "scrypt:...:..." }
]
```

Access is revoked when the new deployment goes live, including for sessions
that are already signed in.

### List editors

```bash
node -e 'console.log(require("./editors.json").map((e) => e.email).join("\n"))'
```

### Sign everyone out

Set `WIKI_SESSION_SECRET` in Vercel to a new value (`openssl rand -hex 32`) and
redeploy. Every existing session becomes invalid, and editors sign in again with
their current passwords.

### Signing in and out

- Clicking **Edit** on a robot page sends you to `/login` if you aren't signed in,
  then back to the editor.
- Restore buttons on the History page only appear when you're signed in.
- The **Sign out** link is at the bottom of the edit page.

## Local development with editing

Without `GITHUB_TOKEN`, the wiki saves edits as commits in your local checkout,
and changes show up immediately. Add to `.env.local` (gitignored):

```bash
echo "WIKI_SESSION_SECRET=$(openssl rand -hex 32)" >> .env.local
npm run add-editor -- you@asu.edu
```

Restart the dev server after changing `.env.local`. Locally, `editors.json` is
read directly, so editor changes apply without a restart.

To test the GitHub flow locally, add the `GITHUB_*` variables to `.env.local`.
Saves will then commit to that branch on GitHub, so point `GITHUB_BRANCH` at a
test branch rather than `main`.

### Configuration reference

| Variable              | Required       | Description                                                             |
| --------------------- | -------------- | ----------------------------------------------------------------------- |
| `WIKI_SESSION_SECRET` | Yes            | Random string (32+ characters) used to sign session cookies             |
| `WIKI_EDITORS`        | On Vercel      | The editors JSON (overrides the file)                                   |
| `WIKI_EDITORS_FILE`   | No             | Path to the editors file. Defaults to `editors.json`                    |
| `GITHUB_TOKEN`        | On Vercel      | Fine-grained token with Contents read/write. Enables the GitHub backend |
| `GITHUB_OWNER`        | With the token | Repository owner                                                        |
| `GITHUB_REPO`         | With the token | Repository name                                                         |
| `GITHUB_BRANCH`       | No             | Branch to commit to. Defaults to `main`                                 |

## Page history

Every save and restore creates a git commit. The History page shows each commit's
author, date and diff, and signed-in editors can restore an earlier version
(which creates a new commit rather than deleting anything).

History only lists commits made on or after `HISTORY_START` in `lib/content.ts`:

```ts
export const HISTORY_START = "2026-03-15";
```

The cutoff is midnight in the server's time zone, which is UTC on Vercel. Older
commits are hidden, not deleted.

## Content

Each robot has a folder in `content/robots/` with a `page.mdx` file. The folder
name is the URL slug (`content/robots/nao/page.mdx` → `/robots/nao`), and each
`##` heading becomes a link in the sidebar.

### Adding a robot

1. Create `content/robots/<slug>/page.mdx` (lowercase letters, numbers, `_` and `-`)
2. Put photos and files in `public/robot-media/<slug>/`
3. Start the page with frontmatter:

```yaml
---
name: Clearpath Husky A200 # required
status: UNDER ASSESSMENT # required
platform: Unmanned Ground Vehicle
nickname: "The Tank"
summary: "One or two sentences shown on cards and the page header."
location: "CRS Lab – Brickyard 2nd Floor"
lastChecked: "2026-09-15"
maintainers:
  - "Ali Kefel"
thumbnail: "/robot-media/<slug>/images/photo.jpg"
resources:
  - label: User Manual
    file: https://example.com/manual.pdf # external link or /robot-media/... path
    type: doc # doc = Documentation, file = Downloads
units: # optional, for robots with several units
  - nickname: Jimmy
    status: OPERATIONAL
    note: Broken finger
---
```

Status values with colors: `OPERATIONAL`, `UNDER ASSESSMENT`, `DEGRADED`,
`MAINTENANCE`, `DOWN`, `BROKEN`.

Portrait photos work best; cards and headers crop images from the top.

### MDX components

| Component                                                | Use                                                                   |
| -------------------------------------------------------- | --------------------------------------------------------------------- |
| `<Callout type="note" title="...">`                      | Highlighted note. Types: `note`, `tip`, `warning`, `danger`           |
| `<Image src="..." alt="..." size="medium" />`            | Captioned image. Sizes: `small`, `medium`, `large`, `extra-large`     |
| `<ImageGrid>...</ImageGrid>`                             | Two-column grid of images                                             |
| `<Video youtubeId="..." />` or `<Video src="..." />`     | YouTube embed or local video                                          |
| `<ResourceLink href="...">Label</ResourceLink>`          | Inline link with a document icon                                      |
| `<RepairEntry title="..." date="..." outcome="success">` | Repair log entry. Outcomes: `success`, `failed`, `partial`, `pending` |

In MDX, `<` and `{` outside code blocks are treated as code. Put things like
`<robot-ip>` inside backticks.

## Development

### Scripts

| Command                         | Description                        |
| ------------------------------- | ---------------------------------- |
| `npm run dev`                   | Start development server           |
| `npm run build`                 | Build for production               |
| `npm start`                     | Run the production build           |
| `npm run lint`                  | Run ESLint                         |
| `npm run lint -- --fix`         | Auto-fix lint issues               |
| `npm run add-editor -- <email>` | Add an editor or change a password |

### Code Quality Checks

Run all checks before pushing:

```bash
npm run lint && npx prettier --check . && npx tsc --noEmit
```

### CI Pipeline

The project runs these checks on push to `main` and on pull requests:

- **Lint** - ESLint for code quality
- **Format** - Prettier formatting check
- **Typecheck** - TypeScript type checking
- **Build** - Next.js production build

### Code Standards

- **No inline components** - Define components outside the render function to preserve state
- **No setState in useEffect** - Use lazy initialization (`useState(() => ...)`) instead
- **Use NextImage** - Always use Next.js `<Image />` component for images (configured for both local and remote patterns)

### Project layout

| Path                           | What it does                                    |
| ------------------------------ | ----------------------------------------------- |
| `content/robots/`              | Robot pages (MDX)                               |
| `lib/content.ts`               | Reading, saving and history of pages (git)      |
| `lib/auth.ts`                  | Editor allow list, password checks and sessions |
| `lib/robots/loader.ts`         | Loads robot frontmatter and compiles MDX        |
| `app/robots/[slug]/actions.ts` | Save and restore server actions                 |
| `app/login/`                   | Sign-in page                                    |
| `scripts/add-editor.mjs`       | CLI for adding editors and changing passwords   |

### Troubleshooting

- **`Can't resolve 'tailwindcss'`** — the dev server was started outside the
  project folder. `cd crs-robot-wiki` and run `npm run dev` again.
- **New styles don't show up in dev** — restart the dev server.
- **Sign-in shows an error mentioning `WIKI_SESSION_SECRET`** — set the secret
  (32+ characters) in Vercel or `.env.local`, then redeploy or restart.
- **"Incorrect email or password" on the live site** — check the email is in
  `WIKI_EDITORS` in Vercel, and that you redeployed after changing it.
- **"Editing and history on Vercel need the GitHub backend"** — the `GITHUB_*`
  variables are missing in Vercel. Add them and redeploy.
- **`GitHub API error 401` or `404`** — the token is expired, or doesn't have
  Contents read/write access to this repository.
- **Saved, but the live page didn't change** — check the deployment in Vercel,
  and that `GITHUB_BRANCH` is the branch Vercel deploys to production.

## Tech Stack

- Next.js 16 (App Router)
- MDX for content (`next-mdx-remote`)
- Shadcn UI + Tailwind CSS v4
- TypeScript

