"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ChevronRight,
  CircleAlert,
  CircleCheck,
  FileCode,
  Loader2,
  LogOut,
  Save,
  WrapText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveRobot } from "@/app/robots/[slug]/actions";
import { logout } from "@/app/login/actions";

type Props = {
  slug: string;
  name: string;
  email: string;
  initialContent: string;
  initialVersion: string;
};

const FRONTMATTER_FIELDS = [
  ["name", "Robot name (required)"],
  [
    "status",
    "OPERATIONAL, UNDER ASSESSMENT, DEGRADED, MAINTENANCE, DOWN, BROKEN",
  ],
  ["platform", "Type of robot, shown above the name"],
  ["summary", "One or two sentences for cards and the header"],
  ["location / lastChecked", "Shown in the page header"],
  ["maintainers", "List of names"],
  ["thumbnail", "/robot-media/<slug>/images/photo.jpg"],
  ["resources", "label, file (URL or /robot-media path), type: doc | file"],
  ["units", "nickname, status, note"],
];

const COMPONENTS = [
  ['<Callout type="warning" title="...">', "note, tip, warning, danger"],
  ['<Image src="..." alt="..." size="medium" />', "small, medium, large"],
  ["<ImageGrid>…</ImageGrid>", "Two images side by side"],
  ['<Video youtubeId="..." />', 'or src="/robot-media/..."'],
  [
    '<RepairEntry title="..." date="..." outcome="success">',
    "success, failed, partial, pending",
  ],
];

function FormattingHelp() {
  return (
    <details className="group rounded-xl border bg-card text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-medium select-none">
        <ChevronRight className="size-4 text-muted-foreground transition group-open:rotate-90" />
        Formatting help
      </summary>
      <div className="grid gap-6 border-t px-4 py-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Frontmatter (between the --- lines)
          </h3>
          <dl className="space-y-1.5">
            {FRONTMATTER_FIELDS.map(([field, help]) => (
              <div key={field} className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="font-mono text-xs text-primary">{field}</dt>
                <dd className="text-xs text-muted-foreground">{help}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Indent list items with two spaces. A wrong indent hides the robot
            from the site.
          </p>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Page content
          </h3>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li>
              <code className="font-mono text-primary">## Heading</code> adds a
              section to the sidebar
            </li>
            {COMPONENTS.map(([tag, help]) => (
              <li key={tag}>
                <code className="font-mono text-primary">{tag}</code> {help}
              </li>
            ))}
            <li>
              Put <code className="font-mono text-primary">&lt;</code> and{" "}
              <code className="font-mono text-primary">{"{"}</code> inside
              backticks, or MDX treats them as code
            </li>
          </ul>
        </div>
      </div>
    </details>
  );
}

export function RobotEditor({
  slug,
  name,
  email,
  initialContent,
  initialVersion,
}: Props) {
  const [content, setContent] = useState(initialContent);
  // What's saved on the server; updated after each save that stays in the editor.
  const [saved, setSaved] = useState({
    content: initialContent,
    version: initialVersion,
  });
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrap, setWrap] = useState(false);
  const [saving, startSaving] = useTransition();
  const gutterRef = useRef<HTMLPreElement>(null);
  const dirty = content !== saved.content;
  const lineCount = content.split("\n").length;

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function handleSave() {
    if (!dirty || saving) return;
    setError(null);
    const submitted = content;
    startSaving(async () => {
      // Local saves redirect to the updated page. GitHub saves return here,
      // because the live page only updates after the redeploy.
      const result = await saveRobot(slug, submitted, saved.version);
      if (!result) return; // redirected
      if ("error" in result) {
        setError(result.error);
      } else {
        setSaved({ content: submitted, version: result.version });
        setJustSaved(true);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      setContent(
        content.slice(0, start) + "  " + content.slice(ta.selectionEnd),
      );
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="sticky top-12 z-10 -mx-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/85 px-4 py-3 backdrop-blur-md">
        <div className="min-w-0">
          <nav className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link href="/robots" className="hover:text-foreground">
              Robot Fleet
            </Link>
            <ChevronRight className="size-3" />
            <Link
              href={`/robots/${slug}`}
              className="truncate hover:text-foreground"
            >
              {name}
            </Link>
            <ChevronRight className="size-3" />
            <span className="text-foreground">Edit</span>
          </nav>
          <div className="mt-0.5 flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold">Edit {name}</h1>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs",
                dirty
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  dirty ? "bg-amber-500" : "bg-muted-foreground/60",
                )}
              />
              {dirty ? "Unsaved changes" : "No changes"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/robots/${slug}`}>Cancel</Link>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {saving ? "Saving…" : "Save"}
            <kbd className="ml-1 hidden rounded border border-primary-foreground/30 px-1 text-[10px] font-normal opacity-80 sm:inline">
              ⌘S
            </kbd>
          </Button>
        </div>
      </header>

      {justSaved && !dirty && (
        <div
          role="status"
          className="flex gap-3 rounded-xl border border-green-600/40 bg-green-600/10 px-4 py-3 text-sm"
        >
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400" />
          <p>
            <span className="font-medium">Saved.</span> The live page updates
            once Vercel finishes redeploying, usually within a couple of
            minutes. The change is already in the{" "}
            <Link
              href={`/robots/${slug}/history`}
              className="underline underline-offset-2"
            >
              page history
            </Link>
            .
          </p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="min-w-0">
            <p className="font-medium text-destructive">
              Couldn&apos;t save this page
            </p>
            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-foreground/80">
              {error}
            </pre>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5 font-mono">
            <FileCode className="size-3.5 shrink-0" />
            <span className="truncate">content/robots/{slug}/page.mdx</span>
          </span>
          <div className="flex items-center gap-3">
            <span className="tabular-nums">
              {lineCount} lines · {content.length.toLocaleString()} chars
            </span>
            <button
              type="button"
              onClick={() => setWrap((w) => !w)}
              aria-pressed={wrap}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 transition hover:bg-accent hover:text-foreground",
                wrap && "bg-accent text-foreground",
              )}
            >
              <WrapText className="size-3.5" />
              Wrap
            </button>
          </div>
        </div>

        <div className="relative flex h-[calc(100svh-17rem)] min-h-96">
          {!wrap && (
            <pre
              ref={gutterRef}
              aria-hidden
              className="shrink-0 overflow-hidden border-r bg-muted/30 px-3 py-4 text-right font-mono text-[13px] leading-6 text-muted-foreground/60 select-none"
            >
              {Array.from({ length: lineCount }, (_, i) => i + 1).join("\n")}
            </pre>
          )}
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setJustSaved(false);
            }}
            onKeyDown={handleKeyDown}
            onScroll={(e) => {
              if (gutterRef.current) {
                gutterRef.current.scrollTop = e.currentTarget.scrollTop;
              }
            }}
            wrap={wrap ? "soft" : "off"}
            spellCheck={false}
            aria-label={`Markdown for ${name}`}
            className={cn(
              "h-full w-full flex-1 resize-none bg-transparent px-4 py-4 font-mono text-[13px] leading-6 outline-none [tab-size:2]",
              wrap ? "whitespace-pre-wrap" : "whitespace-pre",
            )}
          />
        </div>
      </div>

      <FormattingHelp />

      <p className="text-xs text-muted-foreground">
        Signed in as{" "}
        <span className="font-medium text-foreground">{email}</span>. Saving
        checks the page for valid MDX and records the change in the page&apos;s
        history.{" "}
        <button
          type="button"
          onClick={() => {
            if (
              !dirty ||
              window.confirm("Sign out and discard your changes?")
            ) {
              logout();
            }
          }}
          className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
        >
          <LogOut className="size-3" />
          Sign out
        </button>
      </p>
    </div>
  );
}
