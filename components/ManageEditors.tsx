"use client";

import { useActionState, useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addEditor, removeEditor } from "@/app/(wiki)/editors/actions";

export function AddEditorForm() {
  const [state, action, pending] = useActionState(addEditor, null);

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="off"
            defaultValue={state?.email}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Temporary password
          </label>
          <Input
            id="password"
            name="password"
            type="text"
            autoComplete="off"
            minLength={8}
            required
          />
        </div>
      </div>
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state?.message && (
        <p className="text-sm text-muted-foreground">{state.message}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Add editor
      </Button>
    </form>
  );
}

export function RemoveEditorButton({ email }: { email: string }) {
  const [error, setError] = useState(false);
  const [removing, startRemoving] = useTransition();

  function handleRemove() {
    if (!window.confirm(`Remove ${email}? They'll be signed out right away.`)) {
      return;
    }
    setError(false);
    startRemoving(async () => {
      try {
        await removeEditor(email);
      } catch {
        setError(true);
      }
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      {error && (
        <span className="text-xs text-destructive">Couldn&apos;t remove</span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={handleRemove}
        disabled={removing}
        aria-label={`Remove ${email}`}
        title="Remove"
      >
        {removing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
      </Button>
    </div>
  );
}
