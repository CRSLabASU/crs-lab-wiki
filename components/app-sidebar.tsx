"use client";

import Link from "next/link";
import { useMemo } from "react";
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

import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { cn, statusColors } from "@/lib/utils";

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

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <div className="px-2 py-1">
          <Link
            href="/"
            onClick={closeMobile}
            className="text-sm font-semibold leading-tight text-sidebar-foreground hover:text-sidebar-foreground/90"
          >
            Cooperative Robotic Systems (CRS) Lab Wiki
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <TopLink href="/" isActive={pathname === "/"}>
                <span>Home</span>
              </TopLink>

              <TopLink href="/robots" isActive={pathname === "/robots"}>
                <span>Robot Fleet</span>
              </TopLink>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Robots</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sorted.map((r) => {
                const base = `/robots/${r.slug}`;
                const robotActive =
                  pathname === base || pathname.startsWith(base + "/");
                const showSub = activeRobotSlug === r.slug;

                return (
                  <SidebarMenuItem key={r.slug}>
                    <SidebarMenuButton asChild isActive={robotActive}>
                      <Link href={base} onClick={closeMobile}>
                        <span className={statusDot(r.status)} />
                        <span>{r.name}</span>
                      </Link>
                    </SidebarMenuButton>

                    {showSub ? (
                      <SidebarMenuSub>
                        {(r.sections?.length
                          ? r.sections
                          : [{ slug: "overview", label: "Overview" }]
                        ).map((s) => {
                          const href = `${base}${s.slug === "overview" ? "" : `#${s.slug}`}`;
                          return (
                            <SidebarMenuSubItem key={s.slug}>
                              <SidebarMenuSubButton asChild>
                                <Link href={href} onClick={closeMobile}>
                                  {s.label}
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

      <SidebarFooter>
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} CRS Lab
          </span>
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
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
