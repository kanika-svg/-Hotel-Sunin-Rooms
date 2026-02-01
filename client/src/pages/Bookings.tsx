import { useState, useRef } from "react";
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
import { Plus, Search, Trash2, Pencil, Calendar, Download, Receipt, Printer } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { type Booking, type Room } from "@shared/schema";
import { cn } from "@/lib/utils";

export default function Bookings() {
  const [search, setSearch] = useState("");
  const { data: bookings, isLoading } = useBookings({ search });
  const deleteBooking = useDeleteBooking();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Booking & { room: Room } | null>(null);
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

  const exportToCSV = () => {
    if (!bookings || bookings.length === 0) return;

    const headers = ["Guest Name", "Phone", "Room Number", "Room Type", "Check-in", "Check-out", "Status", "Total Price", "Payment Status"];
    const csvRows = bookings.map(b => [
      `"${b.guestName}"`,
      `"${b.phone}"`,
      `"${b.room?.roomNumber}"`,
      `"${b.room?.type}"`,
      `"${format(new Date(b.checkIn), 'yyyy-MM-dd')}"`,
      `"${format(new Date(b.checkOut), 'yyyy-MM-dd')}"`,
      `"${b.status}"`,
      `"${b.room?.currency === 'USD' ? '$' : '₭'}${(b.totalPrice / (b.room?.currency === 'USD' ? 100 : 1)).toLocaleString()}"`,
      `"${b.paymentStatus}"`
    ].join(","));

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bookings_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 relative overflow-hidden">
      <div className="absolute inset-0 bg-hotel-fade z-0" />
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 animate-in relative z-10 pt-20 lg:pt-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Bookings</h1>
            <p className="text-slate-500 mt-1">Manage guest reservations and check-ins.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={exportToCSV} disabled={!bookings?.length}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
            <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" /> New Booking
            </Button>
          </div>
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
          </div>

          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Guest Info</TableHead>
                <TableHead>Stay Dates</TableHead>
                <TableHead>Nights</TableHead>
                <TableHead>Total Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">Loading bookings...</TableCell>
                </TableRow>
              ) : bookings?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No bookings found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                bookings?.map((booking) => {
                  const checkIn = new Date(booking.checkIn);
                  const checkOut = new Date(booking.checkOut);
                  const nights = differenceInDays(checkOut, checkIn);
                  
                  return (
                    <TableRow key={booking.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div className="font-medium text-slate-900">{booking.guestName}</div>
                        <div className="text-xs text-slate-500">Room {booking.room?.roomNumber} ({booking.room?.type})</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{format(checkIn, 'MMM d')} - {format(checkOut, 'MMM d, yyyy')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {nights} {nights === 1 ? 'night' : 'nights'}
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-slate-900">
                          {booking.room?.currency === 'USD' ? '$' : '₭'}
                          {(booking.totalPrice / (booking.room?.currency === 'USD' ? 100 : 1)).toLocaleString()}
                        </div>
                        <Badge variant="outline" className={cn(
                          "text-[10px] uppercase font-bold",
                          booking.paymentStatus === 'Paid' ? "bg-green-50 text-green-600 border-green-200" : "bg-red-50 text-red-600 border-red-200"
                        )}>
                          {booking.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(checkIn, checkOut)}>
                          {getStatusText(checkIn, checkOut)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-500 hover:text-slate-900"
                            onClick={() => setViewingInvoice(booking)}
                            title="Invoice"
                          >
                            <Receipt className="w-4 h-4" />
                          </Button>
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
                        </div>
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
                Create a new booking. Price is calculated automatically.
              </DialogDescription>
            </DialogHeader>
            <BookingForm 
              onSuccess={() => setIsCreateOpen(false)} 
              onCancel={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editingBooking} onOpenChange={(open: boolean) => !open && setEditingBooking(null)}>
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

        {/* Invoice Dialog */}
        <InvoiceDialog 
          booking={viewingInvoice} 
          open={!!viewingInvoice} 
          onOpenChange={(open) => !open && setViewingInvoice(null)} 
        />

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

function InvoiceDialog({ booking, open, onOpenChange }: { booking: (Booking & { room: Room }) | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const printRef = useRef<HTMLDivElement>(null);
  if (!booking) return null;

  const nights = differenceInDays(new Date(booking.checkOut), new Date(booking.checkIn));
  const currency = booking.room?.currency === 'USD' ? '$' : '₭';
  const pricePerNight = booking.room?.currency === 'USD' ? booking.room.price / 100 : booking.room.price;
  const totalPriceDisplay = (booking.totalPrice / (booking.room?.currency === 'USD' ? 100 : 1));
  const invoiceNumber = booking.invoiceNumber || `INV-${booking.id.toString().padStart(6, '0')}`;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const windowPrint = window.open('', '', 'width=900,height=900');
    if (!windowPrint) return;

    windowPrint.document.write('<html><head><title>Invoice</title>');
    windowPrint.document.write('<style>body{font-family:sans-serif;padding:40px;color:#000;}table{width:100%;border-collapse:collapse;margin:20px 0;}th,td{text-align:left;padding:10px;border-bottom:1px solid #ddd;}.header{display:flex;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:20px;margin-bottom:20px;}.footer{margin-top:50px;text-align:center;color:#666;font-size:12px;}.total-section{margin-top:30px;float:right;width:300px;}</style>');
    windowPrint.document.write('</head><body>');
    windowPrint.document.write(printContent.innerHTML);
    windowPrint.document.write('</body></html>');
    windowPrint.document.close();
    windowPrint.focus();
    windowPrint.print();
    windowPrint.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice / Receipt</DialogTitle>
        </DialogHeader>

        <div className="flex justify-end gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
        </div>

        <div ref={printRef} className="p-8 bg-white border border-slate-200 rounded-lg text-slate-900">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tighter mb-1 uppercase">Sunin Hotel</h1>
              <p className="text-sm text-slate-500 font-medium">Professional Hospitality Services</p>
              <p className="text-xs text-slate-400 mt-2">Vientiane, Lao PDR</p>
              <p className="text-xs text-slate-400">Contact: +856 20 1234 5678</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-slate-400 uppercase tracking-widest">Invoice</h2>
              <div className="mt-4 space-y-1">
                <p className="text-sm font-bold">No: {invoiceNumber}</p>
                <p className="text-sm">Date: {format(new Date(), 'MMM d, yyyy')}</p>
                <Badge variant={booking.paymentStatus === 'Paid' ? 'default' : 'outline'} className="mt-2">
                  {booking.paymentStatus}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Guest Information</h3>
              <p className="font-bold text-lg">{booking.guestName}</p>
              <p className="text-sm text-slate-600">{booking.phone}</p>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Booking Details</h3>
              <p className="text-sm"><span className="font-medium">Room:</span> {booking.room?.roomNumber}</p>
              <p className="text-sm"><span className="font-medium">Type:</span> {booking.room?.type}</p>
              <p className="text-sm"><span className="font-medium">Stay:</span> {format(new Date(booking.checkIn), 'MMM d')} - {format(new Date(booking.checkOut), 'MMM d, yyyy')}</p>
            </div>
          </div>

          <table className="w-full mb-8">
            <thead>
              <tr className="border-y border-slate-200 bg-slate-50">
                <th className="py-3 text-left text-xs font-bold uppercase tracking-wider">Description</th>
                <th className="py-3 text-center text-xs font-bold uppercase tracking-wider">Qty/Nights</th>
                <th className="py-3 text-right text-xs font-bold uppercase tracking-wider">Rate</th>
                <th className="py-3 text-right text-xs font-bold uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="py-4">
                  <p className="font-medium text-sm">Accommodation</p>
                  <p className="text-xs text-slate-500">Room {booking.room?.roomNumber} ({booking.room?.type})</p>
                </td>
                <td className="py-4 text-center text-sm">{nights}</td>
                <td className="py-4 text-right text-sm">{currency}{pricePerNight.toLocaleString()}</td>
                <td className="py-4 text-right text-sm font-bold">{currency}{totalPriceDisplay.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div className="ml-auto w-full sm:w-64 pt-6 border-t-2 border-slate-900 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Subtotal:</span>
              <span>{currency}{totalPriceDisplay.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Tax (0%):</span>
              <span>{currency}0</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-2 border-t border-slate-100">
              <span>Total:</span>
              <span className="text-primary">{currency}{totalPriceDisplay.toLocaleString()}</span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-8 mt-12 text-center">
            <p className="text-sm font-medium text-slate-600 mb-1">Thank you for staying at Sunin Hotel!</p>
            <p className="text-xs text-slate-400">Please keep this receipt for your records.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
