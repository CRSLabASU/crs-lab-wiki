import "./globals.css";
import type { Metadata } from "next";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "next-themes";
import { getAllRobotsMeta } from "@/lib/robots/loader";

export const metadata: Metadata = {
  title: "CRS Robot Wiki",
  description: "Robot fleet documentation and strategy log",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const robots = getAllRobotsMeta();

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <SidebarProvider>
            <AppSidebar robots={robots} />
            <main className="flex min-h-svh min-w-0 flex-1 flex-col">
              <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b bg-card/80 backdrop-blur-md px-5">
                <SidebarTrigger />
                <div className="h-4 w-px bg-border" />
                <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  CRS Wiki
                </span>
              </header>
              <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-10">
                <div className="w-full min-w-0 max-w-6xl">{children}</div>
              </div>
            </main>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
