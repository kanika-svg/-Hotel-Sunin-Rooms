import fs from "fs/promises";
import path from "path";
import {
  type Room,
  type InsertRoom,
  type Booking,
  type InsertBooking,
  type DashboardStats,
  type Settings,
  type InsertSettings,
} from "@shared/schema";
import { getAppRoot } from "./appRoot";

export interface IStorage {
  // Rooms
  getRooms(): Promise<Room[]>;
  getRoom(id: number): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: number, updates: Partial<InsertRoom>): Promise<Room>;
  deleteRoom(id: number): Promise<void>;

  // Bookings
  getBookings(params?: { from?: Date; to?: Date; roomId?: number }): Promise<(Booking & { room: Room })[]>;
  getBooking(id: number): Promise<(Booking & { room: Room }) | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, updates: Partial<InsertBooking>): Promise<Booking>;
  deleteBooking(id: number): Promise<void>;

  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(updates: Partial<InsertSettings>): Promise<Settings>;

  // Logic
  checkAvailability(roomId: number, checkIn: Date, checkOut: Date, excludeBookingId?: number): Promise<boolean>;
  getDashboardStats(): Promise<DashboardStats>;
}

// === FILE-BASED STORAGE IMPLEMENTATION ===

type DataFile = {
  rooms: Room[];
  bookings: Booking[];
  settings: Settings | null;
  nextRoomId: number;
  nextBookingId: number;
  nextSettingsId: number;
};

// On Render (and similar hosts) the project dir is read-only at runtime. Use /tmp in production when no dir is set.
const DATA_FILE =
  process.env.HOTEL_SUNIN_DATA_DIR
    ? path.join(process.env.HOTEL_SUNIN_DATA_DIR, "hotel-sunin-data.json")
    : process.env.NODE_ENV === "production"
      ? path.join("/tmp", "hotel-sunin-data.json")
      : path.join(getAppRoot(), "hotel-sunin-data.json");

const defaultData = (): DataFile => ({
  rooms: [],
  bookings: [],
  settings: null,
  nextRoomId: 1,
  nextBookingId: 1,
  nextSettingsId: 1,
});

async function readData(): Promise<DataFile> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as DataFile;

    if (!parsed || typeof parsed !== "object") {
      return defaultData();
    }

    if (!Array.isArray(parsed.rooms)) parsed.rooms = [];
    if (!Array.isArray(parsed.bookings)) parsed.bookings = [];
    if (parsed.nextRoomId == null) parsed.nextRoomId = 1;
    if (parsed.nextBookingId == null) parsed.nextBookingId = 1;
    if (parsed.nextSettingsId == null) parsed.nextSettingsId = 1;

    // Ensure dates are proper Date instances
    parsed.bookings = parsed.bookings.map((b) => ({
      ...b,
      checkIn:
        typeof b.checkIn === "string" ? new Date(b.checkIn) : (b.checkIn as any),
      checkOut:
        typeof b.checkOut === "string"
          ? new Date(b.checkOut)
          : (b.checkOut as any),
      createdAt:
        b.createdAt && typeof b.createdAt === "string"
          ? new Date(b.createdAt)
          : (b.createdAt as any),
    }));

    return parsed;
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return defaultData();
    }
    if (err instanceof SyntaxError) {
      try {
        await fs.rename(DATA_FILE, DATA_FILE + ".corrupt." + Date.now());
      } catch (_) {}
      return defaultData();
    }
    throw err;
  }
}

async function writeData(data: DataFile): Promise<void> {
  const serialized: DataFile = {
    ...data,
    bookings: data.bookings.map((b) => ({
      ...b,
      checkIn: b.checkIn instanceof Date ? b.checkIn.toISOString() : (b.checkIn as any),
      checkOut:
        b.checkOut instanceof Date ? b.checkOut.toISOString() : (b.checkOut as any),
      createdAt:
        b.createdAt instanceof Date
          ? b.createdAt.toISOString()
          : (b.createdAt as any),
    })) as any,
  };

  const dir = path.dirname(DATA_FILE);
  await fs.mkdir(dir, { recursive: true });

  const tmpFile = DATA_FILE + ".tmp." + Date.now();
  const json = JSON.stringify(serialized, null, 2);
  await fs.writeFile(tmpFile, json, "utf-8");
  await fs.rename(tmpFile, DATA_FILE);
}

export class FileStorage implements IStorage {
  // === ROOMS ===
  async getRooms(): Promise<Room[]> {
    const data = await readData();
    return [...data.rooms].sort((a, b) =>
      a.roomNumber.localeCompare(b.roomNumber),
    );
  }

  async getRoom(id: number): Promise<Room | undefined> {
    const data = await readData();
    return data.rooms.find((r) => r.id === id);
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const data = await readData();
    const newRoom: Room = {
      id: data.nextRoomId++,
      roomNumber: room.roomNumber,
      type: room.type,
      status: room.status ?? "Available",
      price: room.price ?? 0,
      currency: room.currency ?? "Kip",
    };
    data.rooms.push(newRoom);
    await writeData(data);
    return newRoom;
  }

  async updateRoom(id: number, updates: Partial<InsertRoom>): Promise<Room> {
    const data = await readData();
    const idx = data.rooms.findIndex((r) => r.id === id);
    if (idx === -1) {
      throw new Error("Room not found");
    }
    const updated: Room = {
      ...data.rooms[idx],
      ...updates,
    };
    data.rooms[idx] = updated;
    await writeData(data);
    return updated;
  }

  async deleteRoom(id: number): Promise<void> {
    const data = await readData();
    data.rooms = data.rooms.filter((r) => r.id !== id);
    // Also delete related bookings
    data.bookings = data.bookings.filter((b) => b.roomId !== id);
    await writeData(data);
  }

  // === BOOKINGS ===
  async getBookings(params?: {
    from?: Date;
    to?: Date;
    roomId?: number;
  }): Promise<(Booking & { room: Room })[]> {
    const data = await readData();
    let filtered = [...data.bookings];

    if (params?.roomId) {
      filtered = filtered.filter((b) => b.roomId === params.roomId);
    }

    if (params?.from && params?.to) {
      const from = params.from;
      const to = params.to;
      filtered = filtered.filter((b) => {
        const checkIn = new Date(b.checkIn);
        const checkOut = new Date(b.checkOut);
        return (
          // booking.checkIn is between range
          (checkIn >= from && checkIn <= to) ||
          // booking.checkOut is between range
          (checkOut >= from && checkOut <= to) ||
          // booking fully covers the range
          (checkIn <= from && checkOut >= to)
        );
      });
    }

    filtered.sort(
      (a, b) =>
        new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime(),
    );

    return filtered.map((b) => {
      const room = data.rooms.find((r) => r.id === b.roomId)!;
      return { ...b, room };
    });
  }

  async getBooking(
    id: number,
  ): Promise<(Booking & { room: Room }) | undefined> {
    const data = await readData();
    const booking = data.bookings.find((b) => b.id === id);
    if (!booking) return undefined;
    const room = data.rooms.find((r) => r.id === booking.roomId)!;
    return { ...booking, room };
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const data = await readData();

    let totalPrice = booking.totalPrice ?? 0;
    if (!totalPrice || totalPrice === 0) {
      const room = data.rooms.find((r) => r.id === booking.roomId);
      if (room) {
        const checkIn = new Date(booking.checkIn);
        const checkOut = new Date(booking.checkOut);
        const diffDays = Math.max(
          1,
          Math.ceil(
            (checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24),
          ),
        );
        totalPrice = diffDays * room.price;
      }
    }

    const now = new Date();
    const newBooking: Booking = {
      id: data.nextBookingId++,
      guestName: booking.guestName,
      phone: booking.phone,
      roomId: booking.roomId,
      checkIn: booking.checkIn as any,
      checkOut: booking.checkOut as any,
      status: booking.status ?? "reserved",
      notes: booking.notes ?? null,
      createdAt: (booking as any).createdAt ?? now,
      totalPrice,
      paymentStatus: booking.paymentStatus ?? "Unpaid",
      invoiceNumber: booking.invoiceNumber ?? null,
      identification: (booking as any).identification ?? null,
      discountAmount: (booking as any).discountAmount ?? 0,
    };

    data.bookings.push(newBooking);
    await writeData(data);
    return newBooking;
  }

  async updateBooking(
    id: number,
    updates: Partial<InsertBooking>,
  ): Promise<Booking> {
    const data = await readData();
    const idx = data.bookings.findIndex((b) => b.id === id);
    if (idx === -1) {
      throw new Error("Booking not found");
    }
    const existing = data.bookings[idx];
    const updated: Booking = {
      ...existing,
      ...updates,
      checkIn: (updates.checkIn ?? existing.checkIn) as any,
      checkOut: (updates.checkOut ?? existing.checkOut) as any,
    };
    data.bookings[idx] = updated;
    await writeData(data);
    return updated;
  }

  async deleteBooking(id: number): Promise<void> {
    const data = await readData();
    data.bookings = data.bookings.filter((b) => b.id !== id);
    await writeData(data);
  }

  // === SETTINGS ===
  async getSettings(): Promise<Settings> {
    const data = await readData();
    if (data.settings) return data.settings;

    const defaultSettings: Settings = {
      id: data.nextSettingsId++,
      hotelName: "Sunin Hotel",
      hotelAddress: "Vientiane, Lao PDR",
      hotelPhone: "+856 20 1234 5678",
      hotelLogo: null,
      taxRate: 0,
    };
    data.settings = defaultSettings;
    await writeData(data);
    return defaultSettings;
  }

  async updateSettings(updates: Partial<InsertSettings>): Promise<Settings> {
    const data = await readData();
    const current =
      data.settings ??
      (await this.getSettings()); // getSettings will also write defaults

    const updated: Settings = {
      ...current,
      ...updates,
    } as Settings;

    data.settings = updated;
    await writeData(data);
    return updated;
  }

  // === LOGIC ===
  /** Normalize to start of day (date-only) so time components don't affect overlap. */
  private static startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  async checkAvailability(
    roomId: number,
    checkIn: Date,
    checkOut: Date,
    excludeBookingId?: number,
  ): Promise<boolean> {
    const data = await readData();
    const from = FileStorage.startOfDay(new Date(checkIn));
    const to = FileStorage.startOfDay(new Date(checkOut));

    const conflicting = data.bookings.filter((b) => {
      if (b.roomId !== roomId) return false;
      if (excludeBookingId && b.id === excludeBookingId) return false;

      const existingStart = FileStorage.startOfDay(new Date(b.checkIn));
      const existingEnd = FileStorage.startOfDay(new Date(b.checkOut));

      // Check-out day is exclusive: guest leaves that morning, room free for same-day check-in.
      // Stays are [start, end) so overlap when: existingStart < to && existingEnd > from
      return existingStart.getTime() < to.getTime() && existingEnd.getTime() > from.getTime();
    });

    return conflicting.length === 0;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const data = await readData();
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1,
    );

    const totalRooms = data.rooms.length;

    const activeBookings = data.bookings.filter((b) => {
      const checkIn = new Date(b.checkIn);
      const checkOut = new Date(b.checkOut);
      return checkIn <= endOfDay && checkOut >= startOfDay;
    });

    const checkInsToday = data.bookings.filter((b) => {
      const checkIn = new Date(b.checkIn);
      return checkIn >= startOfDay && checkIn < endOfDay;
    }).length;

    const checkOutsToday = data.bookings.filter((b) => {
      const checkOut = new Date(b.checkOut);
      return checkOut >= startOfDay && checkOut < endOfDay;
    }).length;

    const occupied = activeBookings.length;

    return {
      totalOccupied: occupied,
      checkInsToday,
      checkOutsToday,
      availableRooms: totalRooms - occupied,
    };
  }
}

export const storage = new FileStorage();
