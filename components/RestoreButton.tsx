"use client";

import { useState, useTransition } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { restoreRobot } from "@/app/robots/[slug]/actions";

export function RestoreButton({ slug, sha }: { slug: string; sha: string }) {
  const [error, setError] = useState<string | null>(null);
  const [restoring, startRestoring] = useTransition();

  function handleRestore() {
    if (
      !window.confirm(
        "Restore this version? A new commit will be created on top of current history.",
      )
    ) {
      return;
    }
    setError(null);
    startRestoring(async () => {
      const result = await restoreRobot(slug, sha);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRestore}
        disabled={restoring}
      >
        {restoring ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <RotateCcw className="size-3" />
        )}
        Restore this version
      </Button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </>
  );
}
