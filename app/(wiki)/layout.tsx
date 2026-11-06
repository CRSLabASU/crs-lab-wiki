import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { getAllRobotsMeta } from "@/lib/robots/loader";

// Pages behind sign-in (see proxy.ts) share the sidebar shell. The login page
// sits outside this group, so signed-out visitors don't see the robot list.
export default function WikiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const robots = getAllRobotsMeta();

  return (
    <SidebarProvider>
      <AppSidebar robots={robots} />
      <main className="flex min-h-svh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b bg-background/85 px-5 backdrop-blur-md">
          <SidebarTrigger />
        </header>
        <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-10">
          <div className="w-full min-w-0 max-w-6xl">{children}</div>
        </div>
      </main>
    </SidebarProvider>
  );
}
