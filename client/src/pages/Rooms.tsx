import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useRooms, useCreateRoom, useUpdateRoom, useDeleteRoom } from "@/hooks/use-rooms";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRoomSchema, type InsertRoom } from "@shared/schema";
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

export default function Rooms() {
  const { data: rooms, isLoading } = useRooms();
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

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 animate-in">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Rooms</h1>
            <p className="text-slate-500 mt-1">Manage your hotel's inventory and status.</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" /> Add Room
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoading ? (
            <p className="col-span-full text-center py-12 text-muted-foreground">Loading rooms...</p>
          ) : rooms?.length === 0 ? (
            <p className="col-span-full text-center py-12 text-muted-foreground">No rooms found. Add one to get started.</p>
          ) : (
            rooms?.map((room) => (
              <div key={room.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-all">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                      <BedDouble className="w-6 h-6" />
                    </div>
                    <Badge variant={room.status === 'Available' ? 'default' : 'destructive'} className={room.status === 'Available' ? 'bg-green-100 text-green-700 hover:bg-green-200 shadow-none' : ''}>
                      {room.status}
                    </Badge>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">{room.roomNumber}</h3>
                  <p className="text-slate-500">{room.type}</p>
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingRoom(room)}>
                    <Pencil className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeletingId(room.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
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

  const form = useForm<InsertRoom>({
    resolver: zodResolver(insertRoomSchema),
    defaultValues: initialData || {
      roomNumber: "",
      type: "Standard",
      status: "Available"
    },
  });

  async function onSubmit(data: InsertRoom) {
    try {
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Deluxe">Deluxe</SelectItem>
                      <SelectItem value="VIP">VIP</SelectItem>
                      <SelectItem value="Suite">Suite</SelectItem>
                    </SelectContent>
                  </Select>
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
