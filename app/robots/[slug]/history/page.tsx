import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getEditor } from "@/lib/auth";
import { isValidSlug, listRevisions, type Revision } from "@/lib/content";
import { RestoreButton } from "@/components/RestoreButton";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PatchView({ patch }: { patch: string }) {
  const lines = patch.split("\n");
  return (
    <pre className="not-prose overflow-x-auto rounded-md border bg-muted/30 p-3 text-xs font-mono leading-relaxed">
      {lines.map((line, i) => {
        let cls = "text-foreground";
        if (line.startsWith("+") && !line.startsWith("+++"))
          cls = "text-green-600 dark:text-green-400";
        else if (line.startsWith("-") && !line.startsWith("---"))
          cls = "text-red-600 dark:text-red-400";
        else if (line.startsWith("@@"))
          cls = "text-blue-600 dark:text-blue-400";
        else if (line.startsWith("+++") || line.startsWith("---"))
          cls = "text-muted-foreground";
        return (
          <div key={i} className={cls}>
            {line || " "}
          </div>
        );
      })}
    </pre>
  );
}

export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ restored?: string }>;
}) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();
  const { restored } = await searchParams;

  const editor = await getEditor();
  let revisions: Revision[];
  try {
    revisions = await listRevisions(slug);
  } catch (err) {
    return (
      <div className="not-prose mx-auto w-full max-w-4xl space-y-3">
        <h1 className="text-xl font-semibold">Couldn&apos;t load history</h1>
        <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 font-mono text-xs text-destructive">
          {(err as Error).message}
        </pre>
        <Link href={`/robots/${slug}`} className="text-sm underline">
          Back to page
        </Link>
      </div>
    );
  }

  return (
    <div className="not-prose mx-auto w-full max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold font-mono">
          History: {slug}/page.mdx
        </h1>
        <Link
          href={`/robots/${slug}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </div>

      {restored && (
        <p className="rounded-lg border border-green-600/40 bg-green-600/10 px-4 py-3 text-sm">
          Version restored. The live page updates once Vercel finishes
          redeploying.
        </p>
      )}

      {revisions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No edits to this page yet.
        </p>
      )}

      {revisions.length > 0 && !editor && (
        <p className="text-sm text-muted-foreground">
          <Link
            href={`/login?next=/robots/${slug}/history`}
            className="underline"
          >
            Sign in
          </Link>{" "}
          to restore an earlier version.
        </p>
      )}

      <ol className="space-y-6">
        {revisions.map((rev, i) => (
          <li key={rev.sha} className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{rev.message}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {rev.authorName} · {formatDate(rev.date)} ·{" "}
                  <span className="font-mono">{rev.sha.slice(0, 7)}</span>
                </div>
              </div>
              {editor && i > 0 && <RestoreButton slug={slug} sha={rev.sha} />}
            </div>
            {rev.patch ? (
              <PatchView patch={rev.patch} />
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No diff available.
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
