"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MenuIcon, TerminalIcon } from "lucide-react";

import { TRACKS, TRACK_ORDER } from "@/lib/tracks";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { StreakBadge } from "@/components/streak-badge";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/learn", label: "Learn" },
  { href: "/problems", label: "Problems" },
  { href: "/reference", label: "Reference" },
  { href: "/vscode", label: "VS Code" },
  { href: "/dashboard", label: "Progress" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-background/85 sticky top-0 z-40 border-b backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="md:hidden"
              aria-label="Open menu"
            >
              <MenuIcon className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetTitle className="px-4 pt-4">Menu</SheetTitle>
            <nav className="flex flex-col gap-1 p-2">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="hover:bg-accent rounded-md px-3 py-2 text-sm font-medium"
                >
                  {item.label}
                </Link>
              ))}
              <div className="text-muted-foreground mt-3 px-3 text-[11px] font-semibold tracking-wide uppercase">
                Tracks
              </div>
              {TRACK_ORDER.map((id) => (
                <Link
                  key={id}
                  href={`/learn/${id}`}
                  onClick={() => setOpen(false)}
                  className="hover:bg-accent flex items-center gap-2 rounded-md px-3 py-2 text-sm"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ background: TRACKS[id].colorVar }}
                  />
                  {TRACKS[id].name}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <Link href="/" className="flex items-center gap-2 font-semibold">
          <TerminalIcon className="text-primary size-5" />
          <span className="hidden sm:inline">learnhowtocode</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active =
              item.href === "/learn"
                ? pathname.startsWith("/learn")
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <StreakBadge />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
