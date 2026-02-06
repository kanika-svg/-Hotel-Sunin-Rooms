import hotelLogo from "@assets/IMG_2034_1769871171499.JPG";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  CalendarDays,
  BedDouble,
  Users,
  Menu,
  X,
  Settings as SettingsIcon,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bookings", label: "Bookings", icon: Users },
  { href: "/rooms", label: "Rooms", icon: BedDouble },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function HeroLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen relative">
      {/* Fixed full-bleed hero background */}
      <div className="hero-bg" aria-hidden />

      {/* Fixed transparent top nav */}
      <header
        className="fixed top-0 left-0 right-0 z-50 h-[var(--nav-height)] flex items-center justify-between gap-4 px-4 md:px-6 lg:px-8 bg-black/40 backdrop-blur-md border-b border-white/10 pt-[env(safe-area-inset-top,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]"
        style={{ minHeight: "var(--nav-height)" }}
      >
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/90 flex items-center justify-center shrink-0">
            <img
              src={hotelLogo}
              alt="Sunin Hotel"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-display font-bold text-white text-lg tracking-tight hidden sm:inline">
            Sunin Hotel
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const isActive = location === href;
            return (
              <Link key={href} href={href}>
                <span
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-white/90 hover:text-white hover:bg-white/10",
                    isActive && "bg-white/15 text-white"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/bookings?new=1">
            <Button
              size="sm"
              className="hidden sm:inline-flex rounded-full bg-white/90 text-slate-900 hover:bg-white border-0 shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Booking
            </Button>
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            className="text-sm font-medium text-white/90 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center py-2 px-3 active:opacity-80"
          >
            Sign out
          </button>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="lg:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/90 hover:text-white rounded-lg hover:bg-white/10 active:opacity-80"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="bg-slate-900/40 backdrop-blur-md border-white/10 text-white w-[280px] max-w-[100vw] shadow-2xl [&>button]:text-white [&>button]:opacity-90 [&>button]:hover:opacity-100 [&>button]:hover:bg-white/10 [&>button]:ring-offset-transparent pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] pb-[env(safe-area-inset-bottom,0px)]"
              style={{ paddingTop: "var(--nav-height)" }}
            >
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <nav className="flex flex-col gap-1 pt-4">
                {links.map(({ href, label, icon: Icon }) => {
                  const isActive = location === href;
                  return (
                    <Link key={href} href={href} onClick={() => setMobileOpen(false)}>
                      <span
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors active:opacity-80",
                          isActive
                            ? "bg-white/15 text-white"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        {label}
                      </span>
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-6 pt-4 border-t border-white/10">
                <Link href="/bookings?new=1" onClick={() => setMobileOpen(false)}>
                  <Button
                    size="sm"
                    className="w-full justify-start min-h-[44px] rounded-lg bg-white/15 text-white hover:bg-white/25 active:opacity-80"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Booking
                  </Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main content area */}
      <main className="relative z-10 min-h-screen pt-[var(--nav-height)]">
        {children}
      </main>
    </div>
  );
}
