import Link from "next/link";
import Image from "next/image";
import { Bot } from "lucide-react";
import type { RobotMeta } from "@/lib/robots/loader";
import { StatusBadge } from "@/components/StatusBadge";

export function RobotCard({ robot }: { robot: RobotMeta }) {
  const { slug, name, nickname, status, platform, summary, thumbnail, units } =
    robot;

  return (
    <Link
      href={`/robots/${slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={name}
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
            className="object-cover object-top transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-card text-muted-foreground">
            <Bot className="size-10 opacity-60" strokeWidth={1.5} />
            <span className="text-xs">No photo yet</span>
          </div>
        )}
        <StatusBadge status={status} className="absolute left-3 top-3" />
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        {platform && (
          <p className="text-xs font-medium text-primary">{platform}</p>
        )}
        <h3 className="text-base font-semibold leading-snug">
          {name}
          {nickname && (
            <span className="font-normal text-muted-foreground">
              {" "}
              · “{nickname}”
            </span>
          )}
        </h3>
        {summary && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {summary}
          </p>
        )}
        {units && units.length > 0 && (
          <p className="mt-auto pt-2 text-xs text-muted-foreground">
            {units.length} units
          </p>
        )}
      </div>
    </Link>
  );
}
