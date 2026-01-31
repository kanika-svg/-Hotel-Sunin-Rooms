import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertRoom, UpdateRoomRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useRooms() {
  return useQuery({
    queryKey: [api.rooms.list.path],
    queryFn: async () => {
      const res = await fetch(api.rooms.list.path);
      if (!res.ok) throw new Error("Failed to fetch rooms");
      return api.rooms.list.responses[200].parse(await res.json());
    },
  });
}

export function useRoom(id: number) {
  return useQuery({
    queryKey: [api.rooms.get.path, id],
    enabled: !!id,
    queryFn: async () => {
      const url = buildUrl(api.rooms.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch room");
      return api.rooms.get.responses[200].parse(await res.json());
    },
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertRoom) => {
      const res = await fetch(api.rooms.create.path, {
        method: api.rooms.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create room");
      }
      return api.rooms.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.rooms.list.path] });
      toast({ title: "Success", description: "Room created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateRoomRequest) => {
      const url = buildUrl(api.rooms.update.path, { id });
      const res = await fetch(url, {
        method: api.rooms.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update room");
      }
      return api.rooms.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.rooms.list.path] });
      toast({ title: "Success", description: "Room updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.rooms.delete.path, { id });
      const res = await fetch(url, { method: api.rooms.delete.method });
      if (!res.ok) throw new Error("Failed to delete room");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.rooms.list.path] });
      toast({ title: "Success", description: "Room deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
