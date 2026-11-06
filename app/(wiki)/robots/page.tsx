import { getAllRobotsMeta } from "@/lib/robots/loader";
import { FleetRegister } from "@/components/FleetRegister";

export default function RobotsPage() {
  const robots = getAllRobotsMeta();
  const units = robots.reduce((n, r) => n + (r.units?.length || 1), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Robot Fleet</h1>
        <p className="mt-2 text-muted-foreground">
          {robots.length} robots and {units} units in the CRS Lab. Open a robot
          for its specs, setup guide and repair log.
        </p>
      </div>
      <FleetRegister robots={robots} />
    </div>
  );
}
