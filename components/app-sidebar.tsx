"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

import { BatteryCharging, Bot, House, LogOut, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { cn, statusColors } from "@/lib/utils";
import { logout } from "@/app/login/actions";

function TopLink({
  href,
  children,
  isActive,
}: {
  href: string;
  children: React.ReactNode;
  isActive?: boolean;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={!!isActive}>
        <Link href={href} onClick={closeMobile}>
          {children}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

type RobotMeta = {
  slug: string;
  name: string;
  status: string;
  sections: { slug: string; label: string }[];
};

const GROUP_LABEL = "text-xs font-medium text-muted-foreground";

function statusDot(status: string) {
  return cn(
    "size-2 shrink-0 rounded-full",
    statusColors[status] || "bg-muted-foreground",
  );
}

function useActiveRobotSlug(pathname: string) {
  return pathname.startsWith("/robots/")
    ? pathname.slice(8).split("/")[0]
    : null;
}

/** The section heading nearest the top of the screen, for the "on this page" list. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join(",");

  useEffect(() => {
    const headings = key
      .split(",")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (!headings.length) return;

    const onScroll = () => {
      // Last heading that has scrolled past a line just under the top bar.
      let current: string | null = null;
      for (const h of headings) {
        if (h.getBoundingClientRect().top < 120) current = h.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [key]);

  return active;
}

export function AppSidebar({ robots }: { robots: RobotMeta[] }) {
  const pathname = usePathname() ?? "";
  const activeRobotSlug = useActiveRobotSlug(pathname);

  const sorted = useMemo(
    () => [...robots].sort((a, b) => a.name.localeCompare(b.name)),
    [robots],
  );

  const { isMobile, setOpenMobile } = useSidebar();
  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const { resolvedTheme, setTheme } = useTheme();

  const openRobot = sorted.find((r) => r.slug === activeRobotSlug);
  const activeSection = useActiveSection(
    (openRobot?.sections ?? []).map((sec) => sec.slug),
  );

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <Link
          href="/"
          onClick={closeMobile}
          className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <span className="block font-semibold leading-tight">
            CRS Lab Wiki
          </span>
          <span className="block text-xs leading-tight text-muted-foreground">
            Cooperative Robotic Systems Lab
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={GROUP_LABEL}>Pages</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <TopLink href="/" isActive={pathname === "/"}>
                <House />
                <span>Home</span>
              </TopLink>

              <TopLink href="/robots" isActive={pathname === "/robots"}>
                <Bot />
                <span>Robot Fleet</span>
              </TopLink>

              <TopLink href="/charging" isActive={pathname === "/charging"}>
                <BatteryCharging />
                <span>Charging</span>
              </TopLink>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className={GROUP_LABEL}>Robots</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sorted.map((r) => {
                const base = `/robots/${r.slug}`;
                const robotActive =
                  pathname === base || pathname.startsWith(base + "/");
                const showSub = activeRobotSlug === r.slug;
                const sections = r.sections?.length
                  ? r.sections
                  : [{ slug: "overview", label: "Overview" }];

                return (
                  <SidebarMenuItem key={r.slug}>
                    <SidebarMenuButton asChild isActive={robotActive}>
                      <Link href={base} onClick={closeMobile}>
                        <span className={statusDot(r.status)} />
                        <span>{r.name}</span>
                      </Link>
                    </SidebarMenuButton>

                    {showSub ? (
                      <SidebarMenuSub className="mr-0 mt-1 gap-0 py-1 pr-0">
                        {sections.map((sec) => {
                          const current =
                            (activeSection ?? "overview") === sec.slug;
                          const href = `${base}${sec.slug === "overview" ? "" : `#${sec.slug}`}`;
                          return (
                            <SidebarMenuSubItem key={sec.slug}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={current}
                                className={cn(
                                  // Long section names wrap instead of spilling into the next row.
                                  "-ml-[11px] h-auto min-h-7 rounded-none rounded-r-md border-l-2 border-transparent py-1 pl-3 text-[13px] leading-snug text-sidebar-foreground/70",
                                  "data-[active=true]:border-sidebar-primary data-[active=true]:bg-transparent data-[active=true]:font-medium data-[active=true]:text-sidebar-foreground",
                                )}
                              >
                                <Link href={href} onClick={closeMobile}>
                                  {sec.label}
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center justify-between gap-2 px-2 py-1">
          <span className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} CRS Lab
          </span>
          <div className="flex items-center gap-1">
            <form action={logout}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="size-4" />
              </Button>
            </form>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() =>
                setTheme(resolvedTheme === "light" ? "dark" : "light")
              }
              aria-label="Toggle light and dark mode"
            >
              {/* Pick the icon with CSS: the theme isn't known during server render. */}
              <Moon className="size-4 dark:hidden" />
              <Sun className="hidden size-4 dark:block" />
            </Button>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
