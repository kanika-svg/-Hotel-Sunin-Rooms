import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  roomNumber: text("room_number").notNull().unique(),
  type: text("type").notNull(), // Standard, Deluxe, VIP
  status: text("status").notNull().default("Available"), // Available, Maintenance
  price: integer("price").notNull().default(0),
  currency: text("currency").notNull().default("Kip"), // Kip, USD
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  guestName: text("guest_name").notNull(),
  phone: text("phone").notNull(),
  roomId: integer("room_id").notNull().references(() => rooms.id),
  checkIn: timestamp("check_in").notNull(),
  checkOut: timestamp("check_out").notNull(),
  status: text("status").notNull().default("reserved"), // reserved, checked in, checked out
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  totalPrice: integer("total_price").notNull().default(0),
  paymentStatus: text("payment_status").notNull().default("Unpaid"), // Paid, Unpaid
  invoiceNumber: text("invoice_number").unique(),
});

// === RELATIONS ===

export const roomsRelations = relations(rooms, ({ many }) => ({
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  room: one(rooms, {
    fields: [bookings.roomId],
    references: [rooms.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertRoomSchema = createInsertSchema(rooms, {
  price: z.preprocess((val) => {
    if (typeof val === "string") return parseInt(val, 10);
    return val;
  }, z.number().int().min(0)),
}).omit({ id: true });
export const insertBookingSchema = createInsertSchema(bookings, {
  totalPrice: z.number().int().min(0),
  paymentStatus: z.string().default("Unpaid"),
  invoiceNumber: z.string().optional(),
}).omit({ id: true, createdAt: true });

// === EXPLICIT API CONTRACT TYPES ===

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

// Request types
export type CreateRoomRequest = InsertRoom;
export type UpdateRoomRequest = Partial<InsertRoom>;

export type CreateBookingRequest = InsertBooking;
export type UpdateBookingRequest = Partial<InsertBooking>;

// Response types
export type RoomResponse = Room;
export type BookingResponse = Booking & { room?: Room }; // Often need room details with booking

export type DashboardStats = {
  totalOccupied: number;
  checkInsToday: number;
  checkOutsToday: number;
  availableRooms: number;
};
