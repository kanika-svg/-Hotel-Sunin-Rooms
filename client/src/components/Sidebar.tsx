import hotelLogo from "@assets/IMG_2034_1769871171499.JPG";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { 
  LayoutDashboard, 
  CalendarDays, 
  BedDouble, 
  Users, 
  LogOut,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/bookings", label: "Bookings", icon: Users },
  { href: "/rooms", label: "Rooms", icon: BedDouble },
];

export function Sidebar() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white z-[60] flex items-center justify-between px-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white flex items-center justify-center">
            <img src={hotelLogo} alt="Sunin Hotel Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-display font-bold text-base tracking-tight">Sunin Hotel</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-white transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[55] lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 w-64 bg-slate-900 text-white z-[60] flex flex-col transition-all duration-300 transform lg:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-20 hidden lg:flex items-center px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white flex items-center justify-center">
              <img src={hotelLogo} alt="Sunin Hotel Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight leading-tight">Sunin Hotel</span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 mt-16 lg:mt-0">
          {links.map((link) => {
            const isActive = location === link.href;
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}>
                <div
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-base lg:text-sm font-medium transition-all duration-200 group cursor-pointer active:scale-95",
                    isActive 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-white" : "text-slate-500 group-hover:text-white")} />
                  {link.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button className="flex items-center gap-3 px-3 py-3 w-full rounded-lg text-base lg:text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors active:scale-95">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
