import { db } from "./db";
import {
  rooms,
  bookings,
  type Room,
  type InsertRoom,
  type Booking,
  type InsertBooking,
  type DashboardStats
} from "@shared/schema";
import { eq, and, or, gte, lte, between, sql, not } from "drizzle-orm";

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

  // Logic
  checkAvailability(roomId: number, checkIn: Date, checkOut: Date, excludeBookingId?: number): Promise<boolean>;
  getDashboardStats(): Promise<DashboardStats>;
}

export class DatabaseStorage implements IStorage {
  // === ROOMS ===
  async getRooms(): Promise<Room[]> {
    return await db.select().from(rooms).orderBy(rooms.roomNumber);
  }

  async getRoom(id: number): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [newRoom] = await db.insert(rooms).values(room).returning();
    return newRoom;
  }

  async updateRoom(id: number, updates: Partial<InsertRoom>): Promise<Room> {
    const [updated] = await db.update(rooms).set(updates).where(eq(rooms.id, id)).returning();
    return updated;
  }

  async deleteRoom(id: number): Promise<void> {
    await db.delete(rooms).where(eq(rooms.id, id));
  }

  // === BOOKINGS ===
  async getBookings(params?: { from?: Date; to?: Date; roomId?: number }): Promise<(Booking & { room: Room })[]> {
    const query = db
      .select()
      .from(bookings)
      .innerJoin(rooms, eq(bookings.roomId, rooms.id));

    const conditions = [];
    if (params?.roomId) {
      conditions.push(eq(bookings.roomId, params.roomId));
    }
    // Filter by date range if provided (find bookings that overlap with the range)
    if (params?.from && params?.to) {
      conditions.push(
        or(
          between(bookings.checkIn, params.from, params.to),
          between(bookings.checkOut, params.from, params.to),
          and(lte(bookings.checkIn, params.from), gte(bookings.checkOut, params.to))
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const results = await (whereClause ? query.where(whereClause) : query).orderBy(bookings.checkIn);
    
    // Transform result to match expected type structure: Booking & { room: Room }
    return results.map(r => ({ ...r.bookings, room: r.rooms }));
  }

  async getBooking(id: number): Promise<(Booking & { room: Room }) | undefined> {
    const result = await db
      .select()
      .from(bookings)
      .innerJoin(rooms, eq(bookings.roomId, rooms.id))
      .where(eq(bookings.id, id));
    
    if (result.length === 0) return undefined;
    
    return { ...result[0].bookings, room: result[0].rooms };
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }

  async updateBooking(id: number, updates: Partial<InsertBooking>): Promise<Booking> {
    const [updated] = await db.update(bookings).set(updates).where(eq(bookings.id, id)).returning();
    return updated;
  }

  async deleteBooking(id: number): Promise<void> {
    await db.delete(bookings).where(eq(bookings.id, id));
  }

  // === LOGIC ===
  async checkAvailability(roomId: number, checkIn: Date, checkOut: Date, excludeBookingId?: number): Promise<boolean> {
    // Check if any booking overlaps
    // Overlap condition: (StartA <= EndB) and (EndA >= StartB)
    const conditions = [
      eq(bookings.roomId, roomId),
      // Booking CheckIn is before requested CheckOut
      lte(bookings.checkIn, checkOut),
      // Booking CheckOut is after requested CheckIn
      gte(bookings.checkOut, checkIn),
    ];

    if (excludeBookingId) {
      conditions.push(not(eq(bookings.id, excludeBookingId)));
    }

    const conflicting = await db
      .select()
      .from(bookings)
      .where(and(...conditions));

    return conflicting.length === 0;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const today = new Date();
    // Reset time to start of day for accurate comparison
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Get all rooms count
    const allRooms = await this.getRooms();
    const totalRooms = allRooms.length;

    // Get active bookings for today
    const activeBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          lte(bookings.checkIn, endOfDay),
          gte(bookings.checkOut, startOfDay)
        )
      );

    // Check-ins today
    const checkIns = activeBookings.filter(b => 
      b.checkIn >= startOfDay && b.checkIn < endOfDay
    ).length;

    // Check-outs today
    const checkOuts = activeBookings.filter(b => 
      b.checkOut >= startOfDay && b.checkOut < endOfDay
    ).length;
    
    // Occupied rooms (currently active, not just checking in/out)
    // A room is occupied if checkIn <= Now < checkOut
    // But for "Today's stats", usually implies "staying over tonight" or "occupied at some point today"
    // Let's go with "Occupied tonight" -> checkIn <= Today AND checkOut > Today
    const occupied = activeBookings.filter(b => 
       b.checkIn <= endOfDay && b.checkOut >= startOfDay
    ).length;

    return {
      totalOccupied: occupied,
      checkInsToday: checkIns,
      checkOutsToday: checkOuts,
      availableRooms: totalRooms - occupied,
    };
  }
}

export const storage = new DatabaseStorage();
