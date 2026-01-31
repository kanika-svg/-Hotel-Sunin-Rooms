import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useBookings, useDeleteBooking } from "@/hooks/use-bookings";
import { BookingForm } from "@/components/BookingForm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Trash2, Pencil, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function Bookings() {
  const [search, setSearch] = useState("");
  const { data: bookings, isLoading } = useBookings({ search });
  const deleteBooking = useDeleteBooking();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async () => {
    if (deletingId) {
      await deleteBooking.mutateAsync(deletingId);
      setDeletingId(null);
    }
  };

  const getStatusColor = (start: Date, end: Date) => {
    const now = new Date();
    if (now > end) return "bg-slate-100 text-slate-500 border-slate-200"; // Past
    if (now >= start && now <= end) return "bg-green-50 text-green-700 border-green-200"; // Active
    return "bg-blue-50 text-blue-700 border-blue-200"; // Upcoming
  };

  const getStatusText = (start: Date, end: Date) => {
    const now = new Date();
    if (now > end) return "Completed";
    if (now >= start && now <= end) return "Active";
    return "Confirmed";
  };

  return (
    <div className="flex min-h-screen bg-slate-50 relative overflow-hidden">
      <div className="absolute inset-0 bg-hotel-fade z-0" />
      <Sidebar />
      <main className="flex-1 ml-64 p-8 animate-in relative z-10">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Bookings</h1>
            <p className="text-slate-500 mt-1">Manage guest reservations and check-ins.</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" /> New Booking
          </Button>
        </header>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search guests or rooms..." 
                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {/* Future: Add Date Range Filter here */}
          </div>

          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Guest Info</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Stay Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">Loading bookings...</TableCell>
                </TableRow>
              ) : bookings?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No bookings found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                bookings?.map((booking) => {
                  const checkIn = new Date(booking.checkIn);
                  const checkOut = new Date(booking.checkOut);
                  
                  return (
                    <TableRow key={booking.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div className="font-medium text-slate-900">{booking.guestName}</div>
                        <div className="text-xs text-slate-500">{booking.phone}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-white font-medium">
                          {booking.room?.roomNumber}
                        </Badge>
                        <span className="text-xs text-slate-500 ml-2">{booking.room?.type}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{format(checkIn, 'MMM d')} - {format(checkOut, 'MMM d, yyyy')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(checkIn, checkOut)}>
                          {getStatusText(checkIn, checkOut)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-blue-50"
                          onClick={() => setEditingBooking(booking)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeletingId(booking.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>New Reservation</DialogTitle>
              <DialogDescription>
                Create a new booking. Check availability before confirming.
              </DialogDescription>
            </DialogHeader>
            <BookingForm 
              onSuccess={() => setIsCreateOpen(false)} 
              onCancel={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editingBooking} onOpenChange={(open) => !open && setEditingBooking(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Reservation</DialogTitle>
              <DialogDescription>
                Update booking details for {editingBooking?.guestName}.
              </DialogDescription>
            </DialogHeader>
            {editingBooking && (
              <BookingForm 
                bookingId={editingBooking.id}
                initialData={editingBooking}
                onSuccess={() => setEditingBooking(null)} 
                onCancel={() => setEditingBooking(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently remove the reservation.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Booking</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Yes, Cancel Booking
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </main>
    </div>
  );
}
