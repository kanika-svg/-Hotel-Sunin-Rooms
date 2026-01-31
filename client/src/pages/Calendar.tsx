import { Sidebar } from "@/components/Sidebar";
import { useBookings } from "@/hooks/use-bookings";
import { useRooms } from "@/hooks/use-rooms";
import { addDays, format, startOfToday, differenceInDays } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Calendar() {
  const { data: rooms } = useRooms();
  const { data: bookings } = useBookings();
  const [startDate, setStartDate] = useState(startOfToday());

  const daysToShow = 14;
  const dates = Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i));

  const handlePrev = () => setStartDate(addDays(startDate, -7));
  const handleNext = () => setStartDate(addDays(startDate, 7));

  return (
    <div className="flex min-h-screen bg-slate-50 relative overflow-hidden">
      <div className="absolute inset-0 bg-hotel-fade z-0" />
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col h-screen overflow-hidden relative z-10">
        <header className="flex justify-between items-center p-8 border-b border-slate-200 bg-white">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Calendar</h1>
            <p className="text-slate-500 mt-1">Timeline view of room occupancy.</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-lg font-medium text-slate-700">
              {format(startDate, "MMMM yyyy")}
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-white">
          <div className="min-w-max">
            {/* Header Row */}
            <div className="flex border-b border-slate-200 sticky top-0 bg-white z-20">
              <div className="w-32 p-4 font-semibold text-slate-500 bg-slate-50 border-r border-slate-200 sticky left-0 z-30">
                Rooms
              </div>
              {dates.map((date) => (
                <div key={date.toString()} className="w-32 p-4 text-center border-r border-slate-100 last:border-r-0">
                  <div className="text-sm font-bold text-slate-900">{format(date, "EEE")}</div>
                  <div className="text-xs text-slate-500">{format(date, "d")}</div>
                </div>
              ))}
            </div>

            {/* Room Rows */}
            <div className="relative">
              {rooms?.map((room) => (
                <div key={room.id} className="flex border-b border-slate-100 group hover:bg-slate-50/50 transition-colors h-20 relative">
                  {/* Room Label */}
                  <div className="w-32 p-4 border-r border-slate-200 bg-white sticky left-0 z-10 flex flex-col justify-center">
                    <span className="font-bold text-slate-900">{room.roomNumber}</span>
                    <span className="text-xs text-slate-500">{room.type}</span>
                  </div>

                  {/* Grid Cells */}
                  {dates.map((date) => (
                    <div key={date.toString()} className="w-32 border-r border-slate-100 last:border-r-0 h-full" />
                  ))}

                  {/* Bookings Overlay */}
                  {bookings
                    ?.filter((b) => b.roomId === room.id)
                    .map((booking) => {
                      const checkIn = new Date(booking.checkIn);
                      const checkOut = new Date(booking.checkOut);
                      
                      // Calculate position and width
                      const startDiff = differenceInDays(checkIn, startDate);
                      const duration = differenceInDays(checkOut, checkIn);
                      
                      // Only render if visible in current view
                      if (startDiff + duration < 0 || startDiff >= daysToShow) return null;

                      // Adjust for partial visibility
                      const visibleStart = Math.max(0, startDiff);
                      const visibleDuration = Math.min(duration - (visibleStart - startDiff), daysToShow - visibleStart);

                      if (visibleDuration <= 0) return null;

                      const left = visibleStart * 8 + "rem"; // 8rem = w-32
                      const width = visibleDuration * 8 + "rem";

                      // Determine Color
                      const isActive = new Date() >= checkIn && new Date() <= checkOut;
                      const isPast = new Date() > checkOut;
                      
                      let colorClass = "bg-blue-500 hover:bg-blue-600";
                      if (isActive) colorClass = "bg-green-500 hover:bg-green-600";
                      if (isPast) colorClass = "bg-slate-400 hover:bg-slate-500";

                      return (
                        <div
                          key={booking.id}
                          className={`absolute top-2 bottom-2 rounded-md shadow-sm border border-white/20 text-white text-xs p-2 overflow-hidden whitespace-nowrap z-0 transition-all cursor-pointer ${colorClass}`}
                          style={{
                            left: `calc(8rem + ${left})`, // 8rem offset for sidebar
                            width: `calc(${width} - 4px)`, // -4px for gap
                            marginLeft: '2px'
                          }}
                          title={`${booking.guestName} (${format(checkIn, 'MMM d')} - ${format(checkOut, 'MMM d')})`}
                        >
                          <span className="font-semibold">{booking.guestName}</span>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
