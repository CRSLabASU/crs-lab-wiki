import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Archive,
  ArrowUpRight,
  Bot,
  CalendarCheck,
  FileText,
  History,
  MapPin,
  Pencil,
  Users,
} from "lucide-react";
import {
  getRobotData,
  getRobotPageContent,
  getRobotSlugs,
  type RobotMeta,
  type RobotResource,
} from "@/lib/robots/loader";
import { statusColors } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";

// Pre-render every robot page; saves call revalidatePath to rebuild just that page.
export function generateStaticParams() {
  return getRobotSlugs().map((slug) => ({ slug }));
}

function resourceDetail(resource: RobotResource) {
  if (resource.file.startsWith("http")) {
    return new URL(resource.file).hostname.replace(/^www\./, "");
  }
  return resource.file.split(".").pop()?.toUpperCase() ?? "File";
}

function ResourceCard({ resource }: { resource: RobotResource }) {
  const isExternal = resource.file.startsWith("http");
  const Icon = resource.type === "file" ? Archive : FileText;

  return (
    <Link
      href={resource.file}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className="group flex items-center gap-3 rounded-lg border bg-card p-3 transition hover:border-primary/40 hover:bg-accent/40"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:text-primary">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {resource.label}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {resourceDetail(resource)}
        </span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
    </Link>
  );
}

function ResourceSection({
  title,
  resources,
}: {
  title: string;
  resources: RobotResource[];
}) {
  if (resources.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {resources.map((r) => (
          <ResourceCard key={r.file} resource={r} />
        ))}
      </div>
    </section>
  );
}

function RobotHeader({ robot }: { robot: RobotMeta }) {
  const facts = [
    { icon: MapPin, label: "Location", value: robot.location },
    {
      icon: CalendarCheck,
      label: "Last checked",
      value: robot.lastChecked && String(robot.lastChecked),
    },
    { icon: Users, label: "Maintainers", value: robot.maintainers?.join(", ") },
  ].filter((f) => f.value);

  return (
    <section
      id="overview"
      className="overflow-hidden rounded-2xl border bg-card shadow-sm"
    >
      <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="relative aspect-[4/3] bg-muted md:aspect-auto md:min-h-80">
          {robot.thumbnail ? (
            <Image
              src={robot.thumbnail}
              alt={robot.name}
              fill
              priority
              sizes="(min-width: 768px) 360px, 100vw"
              className="object-cover object-top"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Bot className="size-14 opacity-50" strokeWidth={1.25} />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <StatusBadge status={robot.status} />
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/robots/${robot.slug}/history`}>
                  <History />
                  History
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/robots/${robot.slug}/edit`}>
                  <Pencil />
                  Edit
                </Link>
              </Button>
            </div>
          </div>

          <div>
            {robot.platform && (
              <p className="text-sm font-medium text-primary">
                {robot.platform}
              </p>
            )}
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              {robot.name}
            </h1>
            {robot.nickname && (
              <p className="text-muted-foreground">“{robot.nickname}”</p>
            )}
          </div>

          {robot.summary && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {robot.summary}
            </p>
          )}

          {facts.length > 0 && (
            <dl className="mt-auto grid gap-3 border-t pt-4 text-sm sm:grid-cols-2">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex gap-2">
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      {robot.units && robot.units.length > 0 && (
        <div className="border-t px-6 py-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Units
          </p>
          <div className="flex flex-wrap gap-2">
            {robot.units.map((unit) => (
              <div
                key={unit.nickname}
                className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1"
              >
                <span
                  className={`size-2 rounded-full ${statusColors[unit.status] || "bg-muted-foreground"}`}
                  title={unit.status}
                />
                <span className="text-sm font-medium">{unit.nickname}</span>
                {unit.note && (
                  <span className="text-xs text-muted-foreground">
                    {unit.note}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default async function RobotPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let robot;
  try {
    robot = getRobotData(slug);
  } catch {
    notFound();
  }

  const page = await getRobotPageContent(slug);
  if (!page) notFound();

  const resources = robot.resources ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-10">
      <RobotHeader robot={robot} />

      <ResourceSection
        title="Documentation"
        resources={resources.filter((r) => r.type !== "file")}
      />
      <ResourceSection
        title="Downloads"
        resources={resources.filter((r) => r.type === "file")}
      />

      <div className="prose prose-neutral max-w-none dark:prose-invert">
        {page.content}
      </div>
    </div>
  );
}
