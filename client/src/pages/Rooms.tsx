import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useRooms, useCreateRoom, useUpdateRoom, useDeleteRoom } from "@/hooks/use-rooms";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRoomSchema, type InsertRoom } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Plus, Pencil, Trash2, Loader2, BedDouble } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBookings } from "@/hooks/use-bookings";
import { cn } from "@/lib/utils";

export default function Rooms() {
  const { data: rooms, isLoading: isLoadingRooms } = useRooms();
  const { data: bookings } = useBookings();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const deleteRoom = useDeleteRoom();
  const handleDelete = async () => {
    if (deletingId) {
      await deleteRoom.mutateAsync(deletingId);
      setDeletingId(null);
    }
  };

  const getRoomBookingStatus = (roomId: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find any booking for this room that is currently active
    const activeBooking = bookings?.find(b => 
      b.roomId === roomId && 
      new Date(b.checkIn) <= new Date() && 
      new Date(b.checkOut) >= today &&
      b.status !== 'checked out'
    );

    return activeBooking || null;
  };

  return (
    <div className="flex min-h-screen bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-rooms-full z-0 opacity-40 bg-[length:100%_100%] bg-no-repeat" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-slate-900/60 z-0" />
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 animate-in relative z-10 text-white pt-20 lg:pt-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-white">Rooms</h1>
            <p className="text-slate-300 mt-1">Manage your hotel's inventory and status.</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" /> Add Room
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoadingRooms ? (
            <p className="col-span-full text-center py-12 text-slate-400">Loading rooms...</p>
          ) : rooms?.length === 0 ? (
            <p className="col-span-full text-center py-12 text-slate-400">No rooms found. Add one to get started.</p>
          ) : (
            rooms?.map((room) => {
              const activeBooking = getRoomBookingStatus(room.id);
              const bookingStatus = activeBooking?.status;
              const displayStatus = bookingStatus === 'checked in' ? 'Occupied' : room.status;

              return (
                <div key={room.id} className="bg-slate-900/40 backdrop-blur-md rounded-xl shadow-2xl border border-white/10 overflow-hidden group hover:bg-slate-900/60 transition-all flex flex-col">
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col gap-1">
                        <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-blue-400">
                          <BedDouble className="w-6 h-6" />
                        </div>
                        {activeBooking && (
                          <p className="text-xs font-medium text-blue-400 mt-2 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 max-w-[120px] truncate">
                            {activeBooking.guestName}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={displayStatus === 'Available' ? 'default' : 'destructive'} className={cn(
                          "capitalize",
                          displayStatus === 'Available' ? 'bg-green-500/20 text-green-400 border-green-500/20 hover:bg-green-500/30 shadow-none' : 
                          displayStatus === 'Occupied' ? 'bg-blue-500/20 text-blue-400 border-blue-500/20 hover:bg-blue-500/30 shadow-none' : ''
                        )}>
                          {displayStatus}
                        </Badge>
                        {bookingStatus && bookingStatus !== 'checked in' && (
                          <Badge variant="outline" className={cn(
                            "capitalize",
                            bookingStatus === 'reserved' ? "border-amber-500/20 bg-amber-500/10 text-amber-400" :
                            "border-white/10 bg-white/5 text-slate-400"
                          )}>
                            {bookingStatus}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white">{room.roomNumber}</h3>
                    <p className="text-slate-400">{room.type}</p>
                    <p className="text-white font-bold mt-2">
                      {room.currency === "USD" ? "$" : "₭"}
                      {room.currency === "USD" 
                        ? (room.price / 100).toFixed(2) 
                        : room.price.toLocaleString()}
                    </p>
                  </div>
                  <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex justify-end gap-2 mt-auto">
                    <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10" onClick={() => setEditingRoom(room)}>
                      <Pencil className="w-4 h-4 mr-1" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => setDeletingId(room.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Create/Edit Room Dialog Wrapper */}
        <RoomDialog 
          open={isCreateOpen} 
          onOpenChange={setIsCreateOpen} 
        />
        
        {editingRoom && (
          <RoomDialog 
            open={!!editingRoom} 
            onOpenChange={(open) => !open && setEditingRoom(null)} 
            initialData={editingRoom}
          />
        )}

        {/* Delete Dialog */}
        <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Room?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete Room {rooms?.find(r => r.id === deletingId)?.roomNumber} and all its associated bookings.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Delete Room
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}

function RoomDialog({ open, onOpenChange, initialData }: { open: boolean; onOpenChange: (open: boolean) => void; initialData?: any }) {
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const isEditing = !!initialData;
  const isPending = createRoom.isPending || updateRoom.isPending;

  const form = useForm<any>({
    resolver: zodResolver(insertRoomSchema),
    defaultValues: initialData ? {
      ...initialData,
      price: initialData.currency === "USD" ? (initialData.price / 100).toString() : initialData.price.toString()
    } : {
      roomNumber: "",
      type: "Standard",
      status: "Available",
      price: "0",
      currency: "Kip"
    },
  });

  async function onSubmit(values: any) {
    try {
      const data = {
        ...values,
        price: values.currency === "USD" 
          ? Math.round(parseFloat(values.price.toString()) * 100)
          : Math.round(parseFloat(values.price.toString()))
      };
      if (isEditing) {
        await updateRoom.mutateAsync({ id: initialData.id, ...data });
      } else {
        await createRoom.mutateAsync(data);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // handled by hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Room" : "Add New Room"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update room details." : "Add a new room to the hotel inventory."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="roomNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Number</FormLabel>
                  <FormControl>
                    <Input placeholder="101" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Type</FormLabel>
                  <FormControl>
                    <Input placeholder="Standard, Deluxe, VIP, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Kip">Kip (₭)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price per Night</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step={form.watch("currency") === "USD" ? "0.01" : "1"} 
                      placeholder={form.watch("currency") === "USD" ? "99.99" : "50000"} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="Occupied">Occupied</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Create Room"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
