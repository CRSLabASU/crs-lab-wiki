import Link from "next/link";
import { ArrowRight, BookOpen, History, Wrench } from "lucide-react";
import { getAllRobotsMeta } from "@/lib/robots/loader";
import { Button } from "@/components/ui/button";
import { RobotCard } from "@/components/RobotCard";

const HEALTHY = new Set(["OPERATIONAL"]);
const OFFLINE = new Set(["DOWN", "BROKEN"]);

const guide = [
  {
    icon: BookOpen,
    title: "Documentation",
    body: "Specs, setup steps and official manuals for every robot in one place.",
  },
  {
    icon: Wrench,
    title: "Diagnostics & repairs",
    body: "Health reports and a log of fixes tried, so nobody repeats a dead end.",
  },
  {
    icon: History,
    title: "Edit & history",
    body: "Approved lab members edit pages in the browser. Every change is tracked.",
  },
];

export default function HomePage() {
  const robots = getAllRobotsMeta();
  const operational = robots.filter((r) => HEALTHY.has(r.status)).length;
  const offline = robots.filter((r) => OFFLINE.has(r.status)).length;

  const stats = [
    { label: "Robots documented", value: robots.length },
    { label: "Operational", value: operational, dot: "bg-green-600" },
    {
      label: "Being assessed or repaired",
      value: robots.length - operational - offline,
      dot: "bg-amber-500",
    },
  ];

  return (
    <div className="space-y-14">
      <section className="relative overflow-hidden rounded-2xl border bg-card px-6 py-10 shadow-sm sm:px-10 sm:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary/15 blur-3xl"
        />
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Cooperative Robotic Systems Lab
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          CRS Robot Wiki
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Documentation, diagnostics and repair notes for every robot in the
          lab.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/robots">
              Browse the fleet
              <ArrowRight />
            </Link>
          </Button>
        </div>

        <dl className="mt-10 grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border bg-background/60 p-4"
            >
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                {s.dot && <span className={`size-2 rounded-full ${s.dot}`} />}
                {s.label}
              </dt>
              <dd className="mt-1 text-3xl font-semibold tabular-nums">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">The fleet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a robot to see its specs, setup and repair history.
            </p>
          </div>
          <Link
            href="/robots"
            className="shrink-0 text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {robots.map((robot) => (
            <RobotCard key={robot.slug} robot={robot} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {guide.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-xl border bg-card p-5">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="size-4" />
            </span>
            <h3 className="mt-3 font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
