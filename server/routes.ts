import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { differenceInDays } from "date-fns";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // === ROOMS ===
  app.get(api.rooms.list.path, async (req, res) => {
    const rooms = await storage.getRooms();
    res.json(rooms);
  });

  app.get(api.rooms.get.path, async (req, res) => {
    const room = await storage.getRoom(Number(req.params.id));
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.json(room);
  });

  app.post(api.rooms.create.path, async (req, res) => {
    try {
      const input = api.rooms.create.input.parse(req.body);
      const room = await storage.createRoom(input);
      res.status(201).json(room);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.rooms.update.path, async (req, res) => {
    try {
      const input = api.rooms.update.input.parse(req.body);
      const updated = await storage.updateRoom(Number(req.params.id), input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      return res.status(404).json({ message: 'Room not found' });
    }
  });

  app.delete(api.rooms.delete.path, async (req, res) => {
    await storage.deleteRoom(Number(req.params.id));
    res.status(204).send();
  });

  // === BOOKINGS ===
  app.get(api.bookings.list.path, async (req, res) => {
    const input = api.bookings.list.input?.parse(req.query);
    const bookings = await storage.getBookings({
      from: input?.from ? new Date(input.from) : undefined,
      to: input?.to ? new Date(input.to) : undefined,
      roomId: input?.roomId,
    });
    res.json(bookings);
  });

  app.get(api.bookings.get.path, async (req, res) => {
    const booking = await storage.getBooking(Number(req.params.id));
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json(booking);
  });

  app.post(api.bookings.create.path, async (req, res) => {
    try {
      // Coerce dates before validation if they are strings
      const body = { ...req.body };
      if (typeof body.checkIn === 'string') body.checkIn = new Date(body.checkIn);
      if (typeof body.checkOut === 'string') body.checkOut = new Date(body.checkOut);

      const input = api.bookings.create.input.parse(body);
      
      // Calculate total price if not provided
      let totalPrice = input.totalPrice;
      if (!totalPrice) {
        const room = await storage.getRoom(input.roomId);
        if (room) {
          const nights = Math.max(1, differenceInDays(new Date(input.checkOut), new Date(input.checkIn)));
          totalPrice = nights * room.price;
        }
      }

      // Business Logic: Check Availability
      const checkIn = input.checkIn;
      const checkOut = input.checkOut;
      
      if (checkOut <= checkIn) {
         return res.status(400).json({ message: "Check-out must be after check-in" });
      }

      const isAvailable = await storage.checkAvailability(input.roomId, checkIn, checkOut);
      if (!isAvailable) {
        return res.status(409).json({ message: "Room is already booked for these dates" });
      }

      const bookingData = {
        ...input,
        checkIn,
        checkOut,
        totalPrice: totalPrice || 0
      };

      const booking = await storage.createBooking(bookingData as any);
      res.status(201).json(booking);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.bookings.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      
      // Coerce dates before validation if they are strings
      const body = { ...req.body };
      if (typeof body.checkIn === 'string') body.checkIn = new Date(body.checkIn);
      if (typeof body.checkOut === 'string') body.checkOut = new Date(body.checkOut);

      const input = api.bookings.update.input.parse(body);
      const existing = await storage.getBooking(id);
      
      if (!existing) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // If dates or room changed, check availability
      const checkIn = input.checkIn ? new Date(input.checkIn) : new Date(existing.checkIn);
      const checkOut = input.checkOut ? new Date(input.checkOut) : new Date(existing.checkOut);
      const roomId = input.roomId ?? existing.roomId;

      if (checkOut <= checkIn) {
         return res.status(400).json({ message: "Check-out must be after check-in" });
      }

      const isAvailable = await storage.checkAvailability(roomId, checkIn, checkOut, id);
      if (!isAvailable) {
        return res.status(409).json({ message: "Room is already booked for these dates" });
      }

      const updateData = {
        ...input,
        checkIn,
        checkOut
      };

      const updated = await storage.updateBooking(id, updateData as any);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.delete(api.bookings.delete.path, async (req, res) => {
    await storage.deleteBooking(Number(req.params.id));
    res.status(204).send();
  });

  // === DASHBOARD ===
  app.get(api.dashboard.stats.path, async (req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  return httpServer;
}

// Seed Function
async function seed() {
  const existingRooms = await storage.getRooms();
  if (existingRooms.length === 0) {
    console.log("Seeding database...");
    
    // Create Rooms
    const rooms = await Promise.all([
      storage.createRoom({ roomNumber: "101", type: "Standard", price: 250000, status: "Available", currency: "Kip" }),
      storage.createRoom({ roomNumber: "102", type: "Standard", price: 250000, status: "Available", currency: "Kip" }),
      storage.createRoom({ roomNumber: "103", type: "Standard", price: 250000, status: "Maintenance", currency: "Kip" }),
      storage.createRoom({ roomNumber: "201", type: "Deluxe", price: 450000, status: "Available", currency: "Kip" }),
      storage.createRoom({ roomNumber: "202", type: "Deluxe", price: 450000, status: "Available", currency: "Kip" }),
      storage.createRoom({ roomNumber: "301", type: "VIP", price: 850000, status: "Available", currency: "Kip" }),
    ]);

    // Create some Bookings
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    await storage.createBooking({
      guestName: "John Doe",
      phone: "555-0101",
      roomId: rooms[0].id,
      checkIn: today,
      checkOut: tomorrow,
      notes: "Early check-in requested",
      totalPrice: 250000,
      paymentStatus: "Unpaid",
      status: "checked in"
    });

    await storage.createBooking({
      guestName: "Alice Smith",
      phone: "555-0102",
      roomId: rooms[3].id,
      checkIn: today,
      checkOut: nextWeek,
      notes: "VIP Guest",
      totalPrice: 3150000,
      paymentStatus: "Paid",
      status: "checked in"
    });
    
    console.log("Seeding complete!");
  }
}

// Run seed on startup (not blocking server start)
seed().catch(console.error);
