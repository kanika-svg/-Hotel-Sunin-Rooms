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
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { type Booking, type Room, type Settings } from "@shared/schema";
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

          <div className="overflow-x-auto">
            <div className="min-w-[800px] lg:min-w-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="whitespace-nowrap px-4 py-3">Guest Info</TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-3">Stay Dates</TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-3">Nights</TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-3">Total Price</TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-3 hidden lg:table-cell">Status</TableHead>
                  <TableHead className="text-right whitespace-nowrap px-4 py-3">Actions</TableHead>
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
                          <TableCell className="whitespace-nowrap px-4 py-4">
                            <div className="font-medium text-slate-900">{booking.guestName}</div>
                            <div className="text-xs text-slate-500">Room {booking.room?.roomNumber} ({booking.room?.type})</div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-4 py-4">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{format(checkIn, 'MMM d')} - {format(checkOut, 'MMM d, yyyy')}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm font-medium whitespace-nowrap px-4 py-4">
                            {nights} {nights === 1 ? 'night' : 'nights'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-4 py-4">
                            <div className="font-bold text-slate-900">
                              {booking.room?.currency === 'USD' ? '$' : '₭'}
                              {((booking.totalPrice || 0) / (booking.room?.currency === 'USD' ? 100 : 1)).toLocaleString()}
                            </div>
                            <div className="flex flex-col gap-1 mt-1">
                              <Badge variant="outline" className={cn(
                                "text-[10px] uppercase font-bold w-fit",
                                booking.paymentStatus === 'Paid' ? "bg-green-50 text-green-600 border-green-200" : "bg-red-50 text-red-600 border-red-200"
                              )}>
                                {booking.paymentStatus}
                              </Badge>
                              <Badge variant="outline" className={cn("text-[10px] uppercase font-bold w-fit lg:hidden", getStatusColor(checkIn, checkOut))}>
                                {getStatusText(checkIn, checkOut)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-4 py-4 hidden lg:table-cell">
                            <Badge variant="outline" className={getStatusColor(checkIn, checkOut)}>
                              {getStatusText(checkIn, checkOut)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap px-4 py-4">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-slate-500 hover:text-slate-900 lg:h-8 lg:w-8 h-9 w-9"
                                onClick={() => setViewingInvoice(booking)}
                                title="Invoice"
                              >
                                <Receipt className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-blue-50 lg:h-8 lg:w-8 h-9 w-9"
                                onClick={() => setEditingBooking(booking)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50 lg:h-8 lg:w-8 h-9 w-9"
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
          </div>
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
  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  if (!booking) return null;

  const nights = differenceInDays(new Date(booking.checkOut), new Date(booking.checkIn));
  const currency = booking.room?.currency === 'USD' ? '$' : '₭';
  const pricePerNight = booking.room?.currency === 'USD' ? booking.room.price / 100 : booking.room.price;
  const subtotal = booking.totalPrice / (booking.room?.currency === 'USD' ? 100 : 1);
  const taxRate = settings?.taxRate || 0;
  const taxAmount = (subtotal * taxRate) / 100;
  const totalWithTax = subtotal + taxAmount;
  const invoiceNumber = booking.invoiceNumber || `INV-${booking.id.toString().padStart(6, '0')}`;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const windowPrint = window.open('', '', 'width=900,height=900');
    if (!windowPrint) return;

    windowPrint.document.write('<html><head><title>Invoice</title>');
    windowPrint.document.write('<style>');
    windowPrint.document.write(`
      @media print {
        @page { size: auto; margin: 0; }
        body { margin: 1cm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; color: #0f172a; line-height: 1.5; }
      .print-container { max-width: 800px; margin: 0 auto; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
      th { text-align: left; padding: 12px; background-color: #f8fafc; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
      td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #0f172a; padding-bottom: 24px; }
      .logo-section { display: flex; align-items: center; gap: 24px; }
      .logo-img { max-height: 80px; width: auto; }
      .hotel-info h1 { margin: 0; font-size: 28px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.025em; }
      .hotel-info p { margin: 2px 0; color: #64748b; font-size: 14px; }
      .invoice-meta { text-align: right; }
      .invoice-meta h2 { margin: 0; color: #94a3b8; font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
      .invoice-no { margin-top: 16px; font-weight: 700; font-size: 16px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
      .section-label { font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
      .section-content p { margin: 2px 0; font-size: 14px; }
      .section-content .name { font-weight: 700; font-size: 18px; }
      .totals { margin-left: auto; width: 280px; margin-top: 40px; border-top: 2px solid #0f172a; padding-top: 16px; }
      .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
      .total-row.grand-total { border-top: 1px solid #f1f5f9; margin-top: 8px; padding-top: 12px; font-size: 20px; font-weight: 800; }
      .footer { margin-top: 60px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 24px; }
      .footer p { margin: 4px 0; color: #94a3b8; font-size: 12px; }
      .status-badge { display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; margin-top: 8px; }
      .status-paid { background-color: #2563eb; color: #ffffff; }
      .status-unpaid { border: 1px solid #e2e8f0; color: #64748b; }
    `);
    windowPrint.document.write('</style></head><body>');
    windowPrint.document.write('<div class="print-container">');
    windowPrint.document.write(`
      <div class="header">
        <div class="logo-section">
          ${settings?.hotelLogo ? `<img src="${settings.hotelLogo}" class="logo-img" />` : ''}
          <div class="hotel-info">
            <h1>${settings?.hotelName || "Sunin Hotel"}</h1>
            <p>Professional Hospitality Services</p>
            <p>${settings?.hotelAddress || "Vientiane, Lao PDR"}</p>
            <p>Contact: ${settings?.hotelPhone || "+856 20 1234 5678"}</p>
          </div>
        </div>
        <div class="invoice-meta">
          <h2>Invoice</h2>
          <div class="invoice-no">No: ${invoiceNumber}</div>
          <p>Date: ${format(new Date(), 'MMM d, yyyy')}</p>
          <div class="status-badge ${booking.paymentStatus === 'Paid' ? 'status-paid' : 'status-unpaid'}">
            ${booking.paymentStatus.toUpperCase()}
          </div>
        </div>
      </div>

      <div class="grid">
        <div>
          <div class="section-label">Guest Information</div>
          <div class="section-content">
            <p class="name">${booking.guestName}</p>
            <p>${booking.phone}</p>
          </div>
        </div>
        <div>
          <div class="section-label">Booking Details</div>
          <div class="section-content">
            <p><strong>Room:</strong> ${booking.room?.roomNumber}</p>
            <p><strong>Type:</strong> ${booking.room?.type}</p>
            <p><strong>Stay:</strong> ${format(new Date(booking.checkIn), 'MMM d')} - ${format(new Date(booking.checkOut), 'MMM d, yyyy')}</p>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: center;">Qty/Nights</th>
            <th style="text-align: right;">Rate</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <p style="margin: 0; font-weight: 600;">Accommodation</p>
              <p style="margin: 0; font-size: 12px; color: #64748b;">Room ${booking.room?.roomNumber} (${booking.room?.type})</p>
            </td>
            <td style="text-align: center;">${nights}</td>
            <td style="text-align: right;">${currency}${pricePerNight.toLocaleString()}</td>
            <td style="text-align: right; font-weight: 700;">${currency}${subtotal.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <div class="totals">
        <div class="total-row">
          <span style="color: #64748b;">Subtotal:</span>
          <span>${currency}${subtotal.toLocaleString()}</span>
        </div>
        <div class="total-row">
          <span style="color: #64748b;">Tax (${taxRate}%):</span>
          <span>${currency}${taxAmount.toLocaleString()}</span>
        </div>
        <div class="total-row grand-total">
          <span>Total:</span>
          <span style="color: #2563eb;">${currency}${totalWithTax.toLocaleString()}</span>
        </div>
      </div>

      <div class="footer">
        <p style="font-weight: 600; color: #475569;">Thank you for staying at Sunin Hotel!</p>
        <p>Please keep this receipt for your records.</p>
      </div>
    `);
    windowPrint.document.write('</div></body></html>');
    windowPrint.document.close();
    windowPrint.focus();
    setTimeout(() => {
      windowPrint.print();
      windowPrint.close();
    }, 250);
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
            <div className="flex items-center gap-6">
              {settings?.hotelLogo && (
                <div className="w-24 h-24 overflow-hidden rounded">
                  <img src={settings.hotelLogo} alt="Hotel Logo" className="w-full h-full object-contain" />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold tracking-tighter mb-1 uppercase">{settings?.hotelName || "Sunin Hotel"}</h1>
                <p className="text-sm text-slate-500 font-medium">Professional Hospitality Services</p>
                <p className="text-xs text-slate-400 mt-2">{settings?.hotelAddress || "Vientiane, Lao PDR"}</p>
                <p className="text-xs text-slate-400">Contact: {settings?.hotelPhone || "+856 20 1234 5678"}</p>
              </div>
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
                <td className="py-4 text-right text-sm font-bold">{currency}{subtotal.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div className="ml-auto w-full sm:w-64 pt-6 border-t-2 border-slate-900 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Subtotal:</span>
              <span>{currency}{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Tax ({taxRate}%):</span>
              <span>{currency}{taxAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-2 border-t border-slate-100">
              <span>Total:</span>
              <span className="text-primary">{currency}{totalWithTax.toLocaleString()}</span>
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
