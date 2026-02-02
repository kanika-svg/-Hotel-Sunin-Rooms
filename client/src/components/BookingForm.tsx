import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBookingSchema, type InsertBooking, type Room } from "@shared/schema";
import { useRooms } from "@/hooks/use-rooms";
import { useCreateBooking, useUpdateBooking } from "@/hooks/use-bookings";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, differenceInDays } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DialogFooter } from "@/components/ui/dialog";
import { z } from "zod";
import { useState, useEffect } from "react";

// Extend schema to handle Date objects from form that need coercion
const formSchema = insertBookingSchema.extend({
  roomId: z.coerce.number(),
  checkIn: z.coerce.date(),
  checkOut: z.coerce.date(),
  status: z.string().default("reserved"),
  paymentStatus: z.string().default("Unpaid"),
});

type FormData = z.infer<typeof formSchema>;

interface BookingFormProps {
  bookingId?: number;
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BookingForm({ bookingId, initialData, onSuccess, onCancel }: BookingFormProps) {
  const { data: rooms } = useRooms();
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();

  const isEditing = !!bookingId;
  const isPending = createBooking.isPending || updateBooking.isPending;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guestName: initialData?.guestName || "",
      phone: initialData?.phone || "",
      roomId: initialData?.roomId || undefined,
      checkIn: initialData?.checkIn ? new Date(initialData.checkIn) : new Date(),
      checkOut: initialData?.checkOut ? new Date(initialData.checkOut) : new Date(new Date().setDate(new Date().getDate() + 1)),
      status: initialData?.status || "reserved",
      paymentStatus: initialData?.paymentStatus || "Unpaid",
      notes: initialData?.notes || "",
    },
  });

  const selectedRoomId = useWatch({ control: form.control, name: 'roomId' });
  const checkIn = useWatch({ control: form.control, name: 'checkIn' });
  const checkOut = useWatch({ control: form.control, name: 'checkOut' });

  const [calc, setCalc] = useState({ nights: 0, pricePerNight: 0, totalPrice: 0, currency: '₭' });

  useEffect(() => {
    if (selectedRoomId && checkIn && checkOut) {
      const room = rooms?.find(r => r.id === Number(selectedRoomId));
      if (room) {
        const dIn = new Date(checkIn);
        const dOut = new Date(checkOut);
        const nights = differenceInDays(dOut, dIn);
        if (nights > 0) {
          const pricePerNight = room.currency === 'USD' ? room.price / 100 : room.price;
          setCalc({
            nights,
            pricePerNight,
            totalPrice: nights * (room.price), // Keep internal cents/units for DB
            currency: room.currency === 'USD' ? '$' : '₭'
          });
        } else {
          setCalc({ nights: 0, pricePerNight: 0, totalPrice: 0, currency: room.currency === 'USD' ? '$' : '₭' });
        }
      }
    }
  }, [selectedRoomId, checkIn, checkOut, rooms]);

  async function onSubmit(data: FormData) {
    try {
      const formattedData = {
        ...data,
        notes: data.notes || null,
        roomId: Number(data.roomId),
        totalPrice: calc.totalPrice,
      };
      if (isEditing) {
        await updateBooking.mutateAsync({ id: bookingId, ...formattedData });
      } else {
        await createBooking.mutateAsync(formattedData);
      }
      onSuccess();
    } catch (error) {
      // Error is handled in hook
    }
  }

  // Filter available rooms (simplified - in real app would check availability against dates)
  const availableRooms = rooms?.filter(r => r.status === 'Available' || (isEditing && r.id === initialData?.roomId)) || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="guestName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Guest Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="+1 234 567 8900" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="roomId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Room</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value ? String(field.value) : undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a room" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableRooms.length === 0 && <div className="p-2 text-sm text-muted-foreground">No available rooms</div>}
                    {availableRooms.map((room) => (
                      <SelectItem key={room.id} value={String(room.id)}>
                        Room {room.roomNumber} ({room.type}) - {room.currency === 'USD' ? '$' : '₭'}{room.currency === 'USD' ? (room.price / 100).toFixed(2) : room.price.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Booking Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="checked in">Checked In</SelectItem>
                    <SelectItem value="checked out">Checked Out</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paymentStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Unpaid">Unpaid</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="checkIn"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Check-in Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="checkOut"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Check-out Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date <= (form.getValues("checkIn") || new Date())
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {calc.nights > 0 && (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Price per night:</span>
              <span className="font-medium">{calc.currency}{calc.pricePerNight.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Number of nights:</span>
              <span className="font-medium">{calc.nights}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2 mt-2">
              <span className="text-slate-900">Total Price:</span>
              <span className="text-primary">{calc.currency}{(calc.totalPrice / (calc.currency === '$' ? 100 : 1)).toLocaleString()}</span>
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Special requests, allergies, etc."
                  className="resize-none"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter className="gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update Booking" : "Create Booking"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
