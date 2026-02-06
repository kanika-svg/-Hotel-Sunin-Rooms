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
import { format, differenceInDays, startOfDay, setHours, setMinutes } from "date-fns";
import { CalendarIcon, Loader2, ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DialogFooter } from "@/components/ui/dialog";
import { z } from "zod";
import { useState, useEffect, useRef } from "react";

const MAX_ID_IMAGES = 5;
const MAX_IMAGE_SIZE_MB = 3;

/** Parse "14:00", "14:30", "9", "2:30" etc. into hours and minutes. Returns null if invalid. */
function parseTimeInput(str: string): { h: number; m: number } | null {
  const s = str.trim().replace(/\s/g, "");
  if (!s) return null;
  const parts = s.split(/[.:]/);
  if (parts.length === 1) {
    const h = Math.min(23, Math.max(0, parseInt(parts[0], 10) || 0));
    return { h, m: 0 };
  }
  if (parts.length === 2) {
    const h = Math.min(23, Math.max(0, parseInt(parts[0], 10) || 0));
    const m = Math.min(59, Math.max(0, parseInt(parts[1], 10) || 0));
    return { h, m };
  }
  return null;
}

// Simplified form schema for client-side use
const formSchema = z.object({
  guestName: z.string().min(1, "Guest name is required"),
  phone: z.string().min(1, "Phone number is required"),
  roomId: z.coerce.number().min(1, "Please select a room"),
  checkIn: z.date({ required_error: "Check-in date is required" }),
  checkOut: z.date({ required_error: "Check-out date is required" }),
  status: z.string().default("reserved"),
  paymentStatus: z.string().default("Unpaid"),
  notes: z.string().nullable().optional(),
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

  const defaultCheckIn = (() => {
    if (initialData?.checkIn) return new Date(initialData.checkIn);
    return new Date(); // real-time: current date and time (still editable)
  })();
  const defaultCheckOut = (() => {
    if (initialData?.checkOut) return new Date(initialData.checkOut);
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(11, 0, 0, 0);
    return d;
  })();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guestName: initialData?.guestName || "",
      phone: initialData?.phone || "",
      roomId: initialData?.roomId || undefined,
      checkIn: defaultCheckIn,
      checkOut: defaultCheckOut,
      status: initialData?.status || "reserved",
      paymentStatus: initialData?.paymentStatus || "Unpaid",
      notes: initialData?.notes || "",
    },
  });

  const selectedRoomId = useWatch({ control: form.control, name: 'roomId' });
  const checkIn = useWatch({ control: form.control, name: 'checkIn' });
  const checkOut = useWatch({ control: form.control, name: 'checkOut' });

  const [calc, setCalc] = useState({ nights: 0, pricePerNight: 0, totalPrice: 0, currency: '₭' });
  const [discountAmount, setDiscountAmount] = useState<number>(initialData?.discountAmount ?? 0);
  const [discountType, setDiscountType] = useState<"amount" | "percent">("amount");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [identificationImages, setIdentificationImages] = useState<string[]>(() => {
    if (initialData?.identification) {
      try {
        const parsed = JSON.parse(initialData.identification as string);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [checkInTimeStr, setCheckInTimeStr] = useState("");
  const [checkOutTimeStr, setCheckOutTimeStr] = useState("");
  const idInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedRoomId && checkIn && checkOut) {
      const room = rooms?.find(r => r.id === Number(selectedRoomId));
      if (room) {
        const dIn = new Date(checkIn);
        const dOut = new Date(checkOut);
        const nights = differenceInDays(startOfDay(dOut), startOfDay(dIn));
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

  function handleIdFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    const remaining = MAX_ID_IMAGES - identificationImages.length;
    if (remaining <= 0) return;
    const validFiles: File[] = [];
    for (let i = 0; i < files.length && validFiles.length < remaining; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) continue;
      validFiles.push(file);
    }
    if (validFiles.length === 0) return;
    Promise.all(
      validFiles.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          })
      )
    ).then((dataUrls) => {
      setIdentificationImages((prev) => [...prev, ...dataUrls].slice(0, MAX_ID_IMAGES));
    });
    e.target.value = "";
  }

  function removeIdImage(index: number) {
    setIdentificationImages((prev) => prev.filter((_, i) => i !== index));
  }

  const subtotal = calc.totalPrice;
  const effectiveDiscountAmount =
    discountType === "percent"
      ? Math.min(subtotal, Math.round((subtotal * Math.max(0, discountPercent || 0)) / 100))
      : Math.min(subtotal, Math.max(0, discountAmount || 0));
  const finalTotal = Math.max(0, subtotal - effectiveDiscountAmount);

  async function onSubmit(data: FormData) {
    try {
      const formattedData = {
        ...data,
        notes: data.notes || null,
        roomId: Number(data.roomId),
        totalPrice: finalTotal,
        discountAmount: effectiveDiscountAmount,
        identification: identificationImages.length > 0 ? JSON.stringify(identificationImages) : undefined,
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
        <div className="overflow-y-auto flex-1 min-h-0 space-y-4 pr-1">
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
                  <SelectContent className="max-h-60">
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
                <FormLabel>Check-in Date &amp; Time</FormLabel>
                <div className="flex flex-col gap-2">
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
                        onSelect={(date) => {
                          if (!date) return;
                          const prev = form.getValues("checkIn");
                          const next = setMinutes(setHours(date, prev.getHours()), prev.getMinutes());
                          field.onChange(next);
                          setCheckInTimeStr("");
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="HH:mm (e.g. 14:00)"
                      className="w-full max-w-[140px]"
                      value={checkInTimeStr !== "" ? checkInTimeStr : (field.value ? format(field.value, "HH:mm") : "14:00")}
                      onChange={(e) => setCheckInTimeStr(e.target.value)}
                      onBlur={(e) => {
                        const parsed = parseTimeInput(e.target.value);
                        if (parsed) {
                          const d = form.getValues("checkIn");
                          const next = new Date(d);
                          next.setHours(parsed.h, parsed.m, 0, 0);
                          field.onChange(next);
                          setCheckInTimeStr("");
                        } else {
                          setCheckInTimeStr("");
                        }
                      }}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="checkOut"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Check-out Date &amp; Time</FormLabel>
                <div className="flex flex-col gap-2">
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
                        onSelect={(date) => {
                          if (!date) return;
                          const prev = form.getValues("checkOut");
                          const next = setMinutes(setHours(date, prev.getHours()), prev.getMinutes());
                          field.onChange(next);
                          setCheckOutTimeStr("");
                        }}
                        disabled={(date) => {
                          const checkIn = form.getValues("checkIn");
                          if (!checkIn) return false;
                          const checkInDay = new Date(checkIn);
                          checkInDay.setHours(0, 0, 0, 0);
                          const d = new Date(date);
                          d.setHours(0, 0, 0, 0);
                          return d <= checkInDay;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="HH:mm (e.g. 11:00)"
                      className="w-full max-w-[140px]"
                      value={checkOutTimeStr !== "" ? checkOutTimeStr : (field.value ? format(field.value, "HH:mm") : "11:00")}
                      onChange={(e) => setCheckOutTimeStr(e.target.value)}
                      onBlur={(e) => {
                        const parsed = parseTimeInput(e.target.value);
                        if (parsed) {
                          const d = form.getValues("checkOut");
                          const next = new Date(d);
                          next.setHours(parsed.h, parsed.m, 0, 0);
                          field.onChange(next);
                          setCheckOutTimeStr("");
                        } else {
                          setCheckOutTimeStr("");
                        }
                      }}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Discount (optional) - always visible for both New and Edit reservation */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
          <label className="text-sm font-medium text-slate-700">Discount (optional)</label>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={discountType}
              onValueChange={(v) => setDiscountType(v as "amount" | "percent")}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="percent">Percent</SelectItem>
              </SelectContent>
            </Select>
            {discountType === "amount" ? (
              <Input
                type="number"
                min={0}
                value={discountAmount || ""}
                onChange={(e) =>
                  setDiscountAmount(
                    e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)),
                  )
                }
                placeholder="0"
                className="max-w-[140px]"
              />
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={discountPercent || ""}
                  onChange={(e) =>
                    setDiscountPercent(
                      e.target.value === "" ? 0 : Math.min(100, Math.max(0, Number(e.target.value))),
                    )
                  }
                  placeholder="0"
                  className="max-w-[140px]"
                />
                <span className="text-sm text-slate-500">%</span>
              </div>
            )}
          </div>
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
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal:</span>
              <span className="font-medium">{calc.currency}{(subtotal / (calc.currency === '$' ? 100 : 1)).toLocaleString()}</span>
            </div>
            {effectiveDiscountAmount > 0 && (
              <div className="flex justify-between text-sm text-slate-600">
                <span>
                  Discount{discountType === "percent" && discountPercent > 0 ? ` (${discountPercent}%)` : ""}:
                </span>
                <span>
                  -{calc.currency}
                  {(effectiveDiscountAmount / (calc.currency === "$" ? 100 : 1)).toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2 mt-2">
              <span className="text-slate-900">Total Price:</span>
              <span className="text-primary">{calc.currency}{(finalTotal / (calc.currency === '$' ? 100 : 1)).toLocaleString()}</span>
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

        <div className="space-y-2">
          <FormLabel>Identification (optional)</FormLabel>
          <p className="text-xs text-muted-foreground">Add photos of ID, passport, or other identification.</p>
          <input
            ref={idInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleIdFileChange}
          />
          <div className="flex flex-wrap gap-3">
            {identificationImages.map((dataUrl, index) => (
              <div key={index} className="relative group">
                <img
                  src={dataUrl}
                  alt={`ID ${index + 1}`}
                  className="h-24 w-24 object-cover rounded-lg border border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => removeIdImage(index)}
                  className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white p-1 opacity-90 group-hover:opacity-100"
                  aria-label="Remove image"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {identificationImages.length < MAX_ID_IMAGES && (
              <button
                type="button"
                onClick={() => idInputRef.current?.click()}
                className="h-24 w-24 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-500 hover:border-primary hover:text-primary transition-colors"
              >
                <ImagePlus className="h-8 w-8" />
              </button>
            )}
          </div>
        </div>

        </div>
        <DialogFooter className="gap-2 pt-4 shrink-0 border-t border-slate-200 mt-4 pt-4">
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
