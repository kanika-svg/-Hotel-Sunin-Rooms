import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertBooking, UpdateBookingRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useBookings(params?: { search?: string; from?: string; to?: string; roomId?: number }) {
  // Serialize params for query key stability
  const queryKey = [api.bookings.list.path, JSON.stringify(params)];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const url = new URL(window.location.origin + api.bookings.list.path);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) url.searchParams.append(key, String(value));
        });
      }
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return api.bookings.list.responses[200].parse(await res.json());
    },
  });
}

export function useBooking(id: number) {
  return useQuery({
    queryKey: [api.bookings.get.path, id],
    enabled: !!id,
    queryFn: async () => {
      const url = buildUrl(api.bookings.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch booking");
      return api.bookings.get.responses[200].parse(await res.json());
    },
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertBooking) => {
      const res = await fetch(api.bookings.create.path, {
        method: api.bookings.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create booking");
      }
      return api.bookings.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
      // Invalidate stats too as they change with bookings
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      toast({ title: "Success", description: "Booking created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateBookingRequest) => {
      const url = buildUrl(api.bookings.update.path, { id });
      const res = await fetch(url, {
        method: api.bookings.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update booking");
      }
      return api.bookings.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      toast({ title: "Success", description: "Booking updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.bookings.delete.path, { id });
      const res = await fetch(url, { method: api.bookings.delete.method });
      if (!res.ok) throw new Error("Failed to delete booking");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      toast({ title: "Success", description: "Booking cancelled successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: [api.dashboard.stats.path],
    queryFn: async () => {
      const res = await fetch(api.dashboard.stats.path);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return api.dashboard.stats.responses[200].parse(await res.json());
    },
  });
}
