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
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 animate-in">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 mt-1">Welcome back, here's what's happening today.</p>
          </div>
          <Button onClick={() => setLocation("/bookings")} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
            View All Bookings
          </Button>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Total Occupied" 
            value={statsLoading ? "..." : stats?.totalOccupied || 0} 
            icon={Users} 
            color="blue"
          />
          <StatCard 
            title="Available Rooms" 
            value={statsLoading ? "..." : stats?.availableRooms || 0} 
            icon={BedDouble} 
            color="green"
          />
          <StatCard 
            title="Check-ins Today" 
            value={statsLoading ? "..." : stats?.checkInsToday || 0} 
            icon={LogIn} 
            color="orange"
          />
          <StatCard 
            title="Check-outs Today" 
            value={statsLoading ? "..." : stats?.checkOutsToday || 0} 
            icon={LogOut} 
            color="purple"
          />
        </div>

        {/* Recent Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-display">Recent Bookings</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setLocation("/bookings")}>View All</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bookingsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : displayedBookings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No bookings found.</div>
                  ) : (
                    displayedBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                            {booking.guestName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{booking.guestName}</p>
                            <p className="text-xs text-slate-500">Room {booking.room?.roomNumber} • {booking.room?.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right hidden sm:block">
                            <p className="text-xs font-medium text-slate-900">{format(new Date(booking.checkIn), 'MMM d, yyyy')}</p>
                            <p className="text-xs text-slate-500">Check-in</p>
                          </div>
                          <Badge variant="outline" className="bg-white">
                            {new Date() >= new Date(booking.checkIn) && new Date() <= new Date(booking.checkOut) 
                              ? <span className="text-green-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"/> Active</span>
                              : "Upcoming"
                            }
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setLocation(`/bookings`)}>View Details</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border-none shadow-md h-full bg-slate-900 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <CardHeader>
                <CardTitle className="text-white font-display">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10">
                <Button 
                  onClick={() => setLocation("/bookings")} 
                  className="w-full justify-start bg-white/10 hover:bg-white/20 text-white border-none h-12"
                >
                  <Users className="mr-2 h-4 w-4" /> New Booking
                </Button>
                <Button 
                  onClick={() => setLocation("/rooms")} 
                  className="w-full justify-start bg-white/10 hover:bg-white/20 text-white border-none h-12"
                >
                  <BedDouble className="mr-2 h-4 w-4" /> Manage Rooms
                </Button>
                <Button 
                  onClick={() => setLocation("/calendar")} 
                  className="w-full justify-start bg-white/10 hover:bg-white/20 text-white border-none h-12"
                >
                  <CalendarDays className="mr-2 h-4 w-4" /> View Calendar
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
