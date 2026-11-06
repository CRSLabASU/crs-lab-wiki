# CRS Robot Wiki

[![CI](https://github.com/CRSLabASU/crs-lab-wiki/actions/workflows/ci.yml/badge.svg)](https://github.com/CRSLabASU/crs-lab-wiki/actions/workflows/ci.yml)

[![WIKI](https://img.shields.io/badge/WIKI-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://crs-lab-wiki.vercel.app)

A Next.js wiki for the Cooperative Robotic Systems (CRS) Lab: documentation,
diagnostics and repair notes for every robot in the lab.

## Getting Started

Run all commands from inside the `crs-lab-wiki` folder:

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

### Accounts

The site runs on lab accounts, so it doesn't depend on any one person.

| Service | What it's for                               | How to sign in                                     |
| ------- | ------------------------------------------- | -------------------------------------------------- |
| Vercel  | Hosting                                     | **Continue with Google** as `crslab.bot@gmail.com` |
| Upstash | Redis storage and QStash reminder timing    | **Continue with Google** as `crslab.bot@gmail.com` |
| Google  | Sending reminder emails                     | `crslab.bot@gmail.com`                             |
| GitHub  | The `CRSLabASU/crs-lab-wiki` repo and token | The lab's bot GitHub account                       |

Ask a lab admin for the bot account's sign-in details. Never put them in this
repo.

### 1. Create a GitHub token

The bot GitHub account must be a member of the `CRSLabASU` org with write access
to the repo. Signed in as the bot, create a
[fine-grained personal access token](https://github.com/settings/personal-access-tokens/new):

- **Resource owner:** `CRSLabASU`, not the bot account
- **Repository access:** Only select repositories → `crs-lab-wiki`
- **Permissions:** Contents → **Read and write**
- **Expiration:** The longest the org allows

If the org requires approval, an org owner approves it under org **Settings →
Third-party Access → Personal access tokens → Pending requests**. The token
doesn't work until then.

When the token expires, saving and History stop working, but pages still load.
Set a reminder to replace it and update `GITHUB_TOKEN` in Vercel.

### 2. Create the Vercel project

1. Sign in to [Vercel](https://vercel.com) with Google as `crslab.bot@gmail.com`
2. Choose **Add New → Project** and import `CRSLabASU/crs-lab-wiki`
3. Keep the default Next.js settings

### 3. Create the Upstash services

Sign in to the [Upstash console](https://console.upstash.com) with Google as
`crslab.bot@gmail.com`.

**Redis** stores charging sessions and editors added on the site:

1. Create a Redis database
2. Under **REST API**, copy the URL and token into `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN`

Connecting Redis through the Vercel Marketplace instead sets `KV_REST_API_URL`
and `KV_REST_API_TOKEN` for you, which also work.

**QStash** calls the site when a charge time is up:

1. Open **QStash**
2. Copy the token into `QSTASH_TOKEN`
3. Copy the signing keys into `QSTASH_CURRENT_SIGNING_KEY` and
   `QSTASH_NEXT_SIGNING_KEY`
4. If the page shows a URL other than `https://qstash.upstash.io`, copy it into
   `QSTASH_URL`

### 4. Create the Gmail app password

Signed in to Google as `crslab.bot@gmail.com`, turn on 2-Step Verification, then
create an app password under **Google Account → Security → 2-Step Verification →
App passwords**.

### 5. Add environment variables in Vercel

In the Vercel project, go to **Settings → Environment Variables** and add these
for the Production environment:

| Variable                     | Value                                                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`               | The token from step 1                                                                                                       |
| `GITHUB_OWNER`               | `CRSLabASU`                                                                                                                 |
| `GITHUB_REPO`                | `crs-lab-wiki`                                                                                                              |
| `GITHUB_BRANCH`              | The branch Vercel deploys to production (usually `main`)                                                                    |
| `WIKI_SESSION_SECRET`        | Output of `openssl rand -hex 32`                                                                                            |
| `WIKI_EDITORS`               | Output of `npm run -s editors:env` (see [Editors](#editors))                                                                |
| `UPSTASH_REDIS_REST_URL`     | From step 3                                                                                                                 |
| `UPSTASH_REDIS_REST_TOKEN`   | From step 3                                                                                                                 |
| `QSTASH_TOKEN`               | From step 3                                                                                                                 |
| `QSTASH_CURRENT_SIGNING_KEY` | From step 3                                                                                                                 |
| `QSTASH_NEXT_SIGNING_KEY`    | From step 3                                                                                                                 |
| `QSTASH_URL`                 | From step 3, only if it isn't the default                                                                                   |
| `GMAIL_USER`                 | `crslab.bot@gmail.com`                                                                                                      |
| `GMAIL_APP_PASSWORD`         | From step 4                                                                                                                 |
| `CHARGING_SITE_URL`          | Optional. Site address for QStash callbacks and email links, such as a custom domain. Defaults to the Vercel production URL |

Then redeploy. Environment variable changes only apply to new deployments.

`GITHUB_BRANCH` must be the branch Vercel deploys, or saves won't show up on
the site.

Without Redis, the live site doesn't show an error: it falls back to memory, and
charging sessions disappear or go out of sync. Set the Redis variables even if
the site looks fine without them.

### 6. Check the deployment

On the production site:

1. Sign in, then save a small edit to a robot page
2. On **Manage Editors**, add a test editor, sign in as them, then remove them
3. On **Charging**, start a session and confirm the reminder email arrives.
   Reminders only work on production (see [Charging page](#charging-page))

### What editors see

- Saving keeps you in the editor with a "Saved" message. The change shows up in
  the page's History right away and on the live page after the redeploy.
- Every save or restore creates one commit and one Vercel deployment. CI also
  runs on each commit to `main`.
- Run `git pull` locally before editing content files by hand, since the site
  commits to the same branch.

## Editors

Editors are an allow list of emails with hashed passwords. There are two kinds:

- **Admins** are listed in the `WIKI_EDITORS` variable in Vercel. They can sign
  in, edit, and use the **Manage Editors** page. You manage them on your own
  machine with `npm run add-editor`, which writes `editors.json` (gitignored),
  then copy it into Vercel.
- **Editors** are added on the **Manage Editors** page and stored in Upstash
  Redis (the database from [Charging](#environment-variables)). They can sign in
  and edit, but can't manage other editors.

### Manage Editors page

Admins see **Manage Editors** in the sidebar. Changes apply right away, with no
redeploy.

- **Add an editor:** enter their email and a temporary password (at least 8
  characters), then send them the password. There's no self sign-up.
- **Reset a password:** add the same email again with a new temporary password.
- **Remove an editor:** select the trash icon. They're signed out immediately.

Editors can change their own password with the key icon at the bottom of the
sidebar. Admins can't remove each other here, and a person can't be made an
admin from the page: use the steps below.

The page needs Redis. Without it, for example in local development, only the
admin list exists and the form is hidden.

### Add an admin

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

### Change an admin's password

Run the same command with the editor's existing email, enter the new password,
then update `WIKI_EDITORS` in Vercel and redeploy:

```bash
npm run add-editor -- someone@asu.edu
```

The old password stops working once the new deployment is live. Admins can't
change their own password from the site, so this is also how to reset a
forgotten one.

> Changing a password does **not** sign out sessions that are already signed in
> (sessions last 7 days). To sign everyone out, see below.

### Remove an admin

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

### List admins

Everyone, including editors added on the site, is listed on the Manage Editors
page. To list just the admins:

```bash
node -e 'console.log(require("./editors.json").map((e) => e.email).join("\n"))'
```

### Sign everyone out

Set `WIKI_SESSION_SECRET` in Vercel to a new value (`openssl rand -hex 32`) and
redeploy. Every existing session becomes invalid, and editors sign in again with
their current passwords.

### Signing in and out

- The whole wiki needs sign-in. Opening any page while signed out sends you to
  `/login`, then back to that page. `proxy.ts` does this check on every request.
- Everyone on the allow list can read, edit and restore pages. There's no
  read-only role. Only admins can open Manage Editors.
- Still public: `/login`, the QStash callback `/api/charging/remind` (it checks
  QStash's signature instead), and the files in `public/` such as
  `/robot-media/...`. Those files stay public because Vercel's image optimizer
  fetches them without your sign-in cookie.
- **Sign out** is the icon at the bottom of the sidebar, and at the bottom of
  the edit page.

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
| `WIKI_EDITORS`        | On Vercel      | The admins JSON (overrides the file)                                    |
| `WIKI_EDITORS_FILE`   | No             | Path to the admins file. Defaults to `editors.json`                     |
| `GITHUB_TOKEN`        | On Vercel      | Fine-grained token with Contents read/write. Enables the GitHub backend |
| `GITHUB_OWNER`        | With the token | Repository owner                                                        |
| `GITHUB_REPO`         | With the token | Repository name                                                         |
| `GITHUB_BRANCH`       | No             | Branch to commit to. Defaults to `main`                                 |

The charging and Redis variables are listed in
[Charging page](#environment-variables).

## Charging page

`/charging` tracks which robots are plugged in. There are two kinds of robot
in `lib/charging/robots.ts`:

- **Battery** (the NAOs and the Husky). Click the robot, enter your email and
  mark it as plugged in. When its charge time is up, the wiki emails you to
  unplug it.
- **Docked** (the Kinova MOVO and the UR5). These stay plugged in whenever
  nobody is using them. Mark one as taken off the charger when you start using
  it, and the wiki emails you if it's still off the charger after its time is
  up.

Reminders repeat every hour (up to 3 emails) until someone updates the robot.
Each email has a link that updates the robot without finding it on the page.

Times are set per robot in `lib/charging/robots.ts`:

| Robot                         | Kind    | First reminder after |
| ----------------------------- | ------- | -------------------- |
| NAO (Jimmy, Yoda, Bran, Echo) | Battery | 2 hours              |
| Clearpath Husky A200          | Battery | 10 hours             |
| Kinova MOVO                   | Docked  | 2 hours              |
| UR5 with Robotiq Gripper      | Docked  | 2 hours              |

### How it works

| Piece   | Service                                   | Code                       |
| ------- | ----------------------------------------- | -------------------------- |
| Storage | Upstash Redis                             | `lib/charging/store.ts`    |
| Timing  | Upstash QStash                            | `lib/charging/schedule.ts` |
| Email   | Gmail (`crslab.bot`) with an app password | `lib/charging/email.ts`    |

1. Someone starts a timer. The session is saved in Redis, and the wiki asks
   QStash to call back after the robot's charge time.
2. QStash calls `/api/charging/remind`. The route checks the request's QStash
   signature before sending anything, and QStash retries if the call fails.
3. If the timer is still running, the wiki emails the person who started it from
   `crslab.bot@gmail.com` and schedules the next reminder.
4. The email's link is signed with `WIKI_SESSION_SECRET`, so changing that secret
   breaks links in emails already sent.

If the reminder can't be scheduled, the timer is cancelled and the page shows an
error, so a timer never runs with no reminder coming.

Upstash Redis keys:

| Key                     | Holds                                    |
| ----------------------- | ---------------------------------------- |
| `charging:session:<id>` | One charging session                     |
| `charging:history`      | Session ids, sorted by start time        |
| `charging:active`       | Each robot's open session                |
| `charging:reminders`    | Reminders sent for each session          |
| `wiki:editors`          | Editors added on the Manage Editors page |

### Environment variables

See [Create the Upstash services](#3-create-the-upstash-services) and
[Create the Gmail app password](#4-create-the-gmail-app-password) for setup.

| Variable                     | Where to find it                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `UPSTASH_REDIS_REST_URL`     | Upstash console → Redis database → REST API                                                        |
| `UPSTASH_REDIS_REST_TOKEN`   | Same place                                                                                         |
| `QSTASH_TOKEN`               | Upstash console → QStash                                                                           |
| `QSTASH_CURRENT_SIGNING_KEY` | Upstash console → QStash → Signing keys                                                            |
| `QSTASH_NEXT_SIGNING_KEY`    | Same place                                                                                         |
| `QSTASH_URL`                 | Only if the QStash page shows a URL other than `https://qstash.upstash.io`                         |
| `GMAIL_USER`                 | `crslab.bot@gmail.com`                                                                             |
| `GMAIL_APP_PASSWORD`         | Google Account → Security → 2-Step Verification → App passwords                                    |
| `CHARGING_SITE_URL`          | Optional. Site address for QStash callbacks and email links. Defaults to the Vercel production URL |

Connecting Redis through the Vercel Marketplace sets `KV_REST_API_URL` and
`KV_REST_API_TOKEN` instead, which also work.

QStash callbacks always go to the production site, so test reminders there
rather than on a preview deployment.

### Local development

Without these variables the page still works: sessions are kept in memory
(lost on restart), a timer in the dev server stands in for QStash, and emails
are printed to the terminal instead of sent. QStash can't reach `localhost`, so
leave `QSTASH_TOKEN` out of `.env.local`.

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

| Command                         | Description                           |
| ------------------------------- | ------------------------------------- |
| `npm run dev`                   | Start development server              |
| `npm run build`                 | Build for production                  |
| `npm start`                     | Run the production build              |
| `npm run lint`                  | Run ESLint                            |
| `npm run lint -- --fix`         | Auto-fix lint issues                  |
| `npm run add-editor -- <email>` | Add an admin or change their password |

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

| Path                                  | What it does                                    |
| ------------------------------------- | ----------------------------------------------- |
| `content/robots/`                     | Robot pages (MDX)                               |
| `lib/content.ts`                      | Reading, saving and history of pages (git)      |
| `lib/auth.ts`                         | Editor allow list, password checks and sessions |
| `lib/editors-store.ts`                | Editors added on the site, stored in Redis      |
| `lib/redis.ts`                        | Upstash Redis client                            |
| `lib/charging/`                       | Charging sessions, reminders and email          |
| `lib/robots/loader.ts`                | Loads robot frontmatter and compiles MDX        |
| `proxy.ts`                            | Sends signed-out visitors to the sign-in page   |
| `app/(wiki)/`                         | Pages behind sign-in, with the sidebar layout   |
| `app/(wiki)/robots/[slug]/actions.ts` | Save and restore server actions                 |
| `app/(wiki)/editors/`                 | Manage Editors page (admins only)               |
| `app/(wiki)/password/`                | Change password page                            |
| `app/login/`                          | Sign-in page                                    |
| `scripts/add-editor.mjs`              | CLI for adding admins and changing passwords    |

### Troubleshooting

- **`Can't resolve 'tailwindcss'`** — the dev server was started outside the
  project folder. `cd crs-lab-wiki` and run `npm run dev` again.
- **New styles don't show up in dev** — restart the dev server.
- **Sign-in shows an error mentioning `WIKI_SESSION_SECRET`** — set the secret
  (32+ characters) in Vercel or `.env.local`, then redeploy or restart.
- **"Incorrect email or password" on the live site** — check the email is on the
  Manage Editors page. For an admin, check `WIKI_EDITORS` in Vercel, and that you
  redeployed after changing it.
- **Manage Editors says Redis isn't set up** — add the Redis variables in Vercel
  and redeploy.
- **"Editing and history on Vercel need the GitHub backend"** — the `GITHUB_*`
  variables are missing in Vercel. Add them and redeploy.
- **`GitHub API error 401` or `404`** — the token is expired, or doesn't have
  Contents read/write access to this repository.
- **Saved, but the live page didn't change** — check the deployment in Vercel,
  and that `GITHUB_BRANCH` is the branch Vercel deploys to production.
- **"Couldn't schedule the reminder email"** — check `QSTASH_TOKEN`, and
  `QSTASH_URL` if your QStash page shows a different address.
- **No reminder email arrives** — check the logs on the QStash page. A `401` from
  the site means the signing keys in Vercel are wrong. If QStash shows a `500`,
  check `GMAIL_USER` and `GMAIL_APP_PASSWORD`.
- **Charging sessions disappear** — the Redis variables are missing in Vercel.

## Tech Stack

- Next.js 16 (App Router)
- MDX for content (`next-mdx-remote`)
- Shadcn UI + Tailwind CSS v4
- TypeScript
