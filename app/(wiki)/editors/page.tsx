import { AddEditorForm, RemoveEditorButton } from "@/components/ManageEditors";
import { listEditors, requireAdmin } from "@/lib/auth";
import { canAddEditors } from "@/lib/editors-store";

export const metadata = { title: "Manage Editors" };

export default async function EditorsPage() {
  const you = await requireAdmin("/editors");
  const editors = await listEditors();
  const canAdd = canAddEditors();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Manage Editors</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Editors can sign in, read the wiki and edit pages. Changes here apply
          right away.
        </p>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="font-medium">Add an editor</h2>
          <p className="text-sm text-muted-foreground">
            Choose a temporary password and send it to them. They can change it
            after signing in. Adding an existing editor or admin again resets
            their password.
          </p>
        </div>
        {canAdd ? (
          <AddEditorForm />
        ) : (
          <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
            Redis isn&apos;t set up here, so use <code>npm run add-editor</code>{" "}
            instead.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Editors ({editors.length})</h2>
        <ul className="divide-y rounded-md border">
          {editors.map((editor) => (
            <li
              key={editor.email}
              className="flex items-center justify-between gap-3 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm">
                  {editor.email}
                  {editor.email === you && (
                    <span className="text-muted-foreground"> (you)</span>
                  )}
                </p>
                {editor.addedBy && (
                  <p className="truncate text-xs text-muted-foreground">
                    Added by {editor.addedBy}
                  </p>
                )}
              </div>
              {editor.admin ? (
                <span className="shrink-0 text-xs text-muted-foreground">
                  Admin
                </span>
              ) : (
                <RemoveEditorButton email={editor.email} />
              )}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Admins come from the WIKI_EDITORS variable in Vercel, so they
          can&apos;t be removed here.
        </p>
      </section>
    </div>
  );
}
