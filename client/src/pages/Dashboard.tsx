import { useDashboardStats, useBookings } from "@/hooks/use-bookings";
import { Sidebar } from "@/components/Sidebar";
import { StatCard } from "@/components/StatCard";
import { 
  Users, 
  BedDouble, 
  LogIn, 
  LogOut,
  MoreHorizontal,
  CalendarDays
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentBookings, isLoading: bookingsLoading } = useBookings();
  const [, setLocation] = useLocation();

  const displayedBookings = recentBookings?.slice(0, 5) || [];

  return (
    <div className="flex min-h-screen bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-dashboard-full z-0 opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/40 to-slate-900/20 z-0" />
      <Sidebar />
      <main className="flex-1 ml-64 p-8 animate-in relative z-10">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-white">Sunin Hotel</h1>
            <p className="text-slate-200 mt-1">Welcome back, here's what's happening today.</p>
          </div>
          <Button onClick={() => setLocation("/bookings")} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
            View All Bookings
          </Button>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-white/10 group hover:bg-slate-900/60 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full border border-blue-500/20">Today</span>
            </div>
            <h3 className="text-3xl font-bold text-white">{statsLoading ? "..." : stats?.totalOccupied || 0}</h3>
            <p className="text-slate-400 text-sm">Total Occupied</p>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-white/10 group hover:bg-slate-900/60 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                <BedDouble className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-green-400 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">Available</span>
            </div>
            <h3 className="text-3xl font-bold text-white">{statsLoading ? "..." : stats?.availableRooms || 0}</h3>
            <p className="text-slate-400 text-sm">Available Rooms</p>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-white/10 group hover:bg-slate-900/60 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">
                <LogIn className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-orange-400 bg-orange-500/10 px-2 py-1 rounded-full border border-orange-500/20">Today</span>
            </div>
            <h3 className="text-3xl font-bold text-white">{statsLoading ? "..." : stats?.checkInsToday || 0}</h3>
            <p className="text-slate-400 text-sm">Check-ins Today</p>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-white/10 group hover:bg-slate-900/60 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                <LogOut className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full border border-purple-500/20">Today</span>
            </div>
            <h3 className="text-3xl font-bold text-white">{statsLoading ? "..." : stats?.checkOutsToday || 0}</h3>
            <p className="text-slate-400 text-sm">Check-outs Today</p>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h2 className="text-xl font-bold text-white font-display">Recent Bookings</h2>
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10" onClick={() => setLocation("/bookings")}>View All</Button>
              </div>
              <div className="p-6 space-y-4">
                {bookingsLoading ? (
                  <div className="text-center py-8 text-slate-400">Loading...</div>
                ) : displayedBookings.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">No bookings found.</div>
                ) : (
                  displayedBookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10 cursor-pointer" onClick={() => setLocation(`/bookings`)}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm border border-primary/20">
                          {booking.guestName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-white">{booking.guestName}</p>
                          <p className="text-xs text-slate-400">Room {booking.room?.roomNumber} • {booking.room?.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs font-medium text-white">{format(new Date(booking.checkIn), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-slate-400">Check-in</p>
                        </div>
                        <Badge variant="outline" className="bg-white/5 border-white/10 text-slate-300">
                          {new Date() >= new Date(booking.checkIn) && new Date() <= new Date(booking.checkOut) 
                            ? <span className="text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"/> Active</span>
                            : "Upcoming"
                          }
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 h-full text-white relative overflow-hidden p-6">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <h2 className="text-xl font-bold text-white font-display mb-6">Quick Actions</h2>
              <div className="space-y-4 relative z-10">
                <Button 
                  onClick={() => setLocation("/bookings")} 
                  className="w-full justify-start bg-white/10 hover:bg-white/20 text-white border border-white/10 h-12"
                >
                  <Users className="mr-2 h-4 w-4 text-blue-400" /> New Booking
                </Button>
                <Button 
                  onClick={() => setLocation("/rooms")} 
                  className="w-full justify-start bg-white/10 hover:bg-white/20 text-white border border-white/10 h-12"
                >
                  <BedDouble className="mr-2 h-4 w-4 text-green-400" /> Manage Rooms
                </Button>
                <Button 
                  onClick={() => setLocation("/calendar")} 
                  className="w-full justify-start bg-white/10 hover:bg-white/20 text-white border border-white/10 h-12"
                >
                  <CalendarDays className="mr-2 h-4 w-4 text-amber-400" /> View Calendar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
