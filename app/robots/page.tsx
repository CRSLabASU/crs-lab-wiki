import { getAllRobotsMeta } from "@/lib/robots/loader";
import { RobotCard } from "@/components/RobotCard";

export default function RobotsPage() {
  const robots = getAllRobotsMeta();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Robot Fleet</h1>
        <p className="mt-2 text-muted-foreground">
          {robots.length} robots documented in the CRS Lab.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {robots.map((robot) => (
          <RobotCard key={robot.slug} robot={robot} />
        ))}
      </div>
    </div>
  );
}
