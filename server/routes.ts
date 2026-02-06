import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { differenceInDays, startOfDay } from "date-fns";
import { requireAuth } from "./auth";
import {
  findUserByUsername,
  verifyPassword,
  toPublicUser,
  createUser,
  hasAnyUser,
} from "./users";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Readiness check for Electron: only this instance knows this token
  app.get("/api/ready", (_req, res) => {
    const token = process.env.HOTEL_SUNIN_READINESS_TOKEN;
    res.json({ ok: true, token: token ?? null });
  });

  // === AUTH (public) ===
  app.get("/api/me", (req, res) => {
    if (req.session?.user) {
      return res.json(req.session.user);
    }
    res.status(401).json({ message: "Not authenticated" });
  });

  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body ?? {};
    if (!username || typeof password !== "string") {
      return res.status(400).json({ message: "Username and password required" });
    }
    const user = await findUserByUsername(username);
    if (!user || !(await verifyPassword(user, password))) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    req.session!.user = toPublicUser(user);
    res.json(req.session!.user);
  });

  app.post("/api/logout", (req, res) => {
    req.session?.destroy(() => {});
    res.clearCookie("hotel_sunin_sid");
    res.status(200).json({ ok: true });
  });

  // === FIRST-TIME SETUP (only when no users exist) ===
  app.get("/api/setup/status", async (_req, res) => {
    const canCreateFirstUser = !(await hasAnyUser());
    res.json({ canCreateFirstUser });
  });

  app.post("/api/setup", async (req, res) => {
    if (await hasAnyUser()) {
      return res.status(403).json({ message: "First user already exists. Sign in instead." });
    }
    const { username, password } = req.body ?? {};
    if (!username || typeof username !== "string" || !username.trim()) {
      return res.status(400).json({ message: "Username required" });
    }
    if (!password || typeof password !== "string" || password.length < 4) {
      return res.status(400).json({ message: "Password required (at least 4 characters)" });
    }
    try {
      const user = await createUser(username.trim(), password);
      req.session!.user = toPublicUser(user);
      res.status(201).json(req.session!.user);
    } catch (err: any) {
      return res.status(400).json({ message: err.message || "Failed to create account" });
    }
  });

  // === ROOMS (protected) ===
  app.get(api.rooms.list.path, requireAuth, async (req, res) => {
    const rooms = await storage.getRooms();
    res.json(rooms);
  });

  app.get(api.rooms.get.path, requireAuth, async (req, res) => {
    const room = await storage.getRoom(Number(req.params.id));
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.json(room);
  });

  app.post(api.rooms.create.path, requireAuth, async (req, res) => {
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

  app.put(api.rooms.update.path, requireAuth, async (req, res) => {
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

  app.delete(api.rooms.delete.path, requireAuth, async (req, res) => {
    await storage.deleteRoom(Number(req.params.id));
    res.status(204).send();
  });

  // === BOOKINGS (protected) ===
  app.get(api.bookings.list.path, requireAuth, async (req, res) => {
    const input = api.bookings.list.input?.parse(req.query);
    const bookings = await storage.getBookings({
      from: input?.from ? new Date(input.from) : undefined,
      to: input?.to ? new Date(input.to) : undefined,
      roomId: input?.roomId,
    });
    res.json(bookings);
  });

  app.get(api.bookings.get.path, requireAuth, async (req, res) => {
    const booking = await storage.getBooking(Number(req.params.id));
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json(booking);
  });

  app.post(api.bookings.create.path, requireAuth, async (req, res) => {
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
          const nights = Math.max(1, differenceInDays(startOfDay(new Date(input.checkOut)), startOfDay(new Date(input.checkIn))));
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

  app.put(api.bookings.update.path, requireAuth, async (req, res) => {
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

  app.delete(api.bookings.delete.path, requireAuth, async (req, res) => {
    await storage.deleteBooking(Number(req.params.id));
    res.status(204).send();
  });

  // === DASHBOARD (protected) ===
  app.get(api.dashboard.stats.path, requireAuth, async (req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  // === SETTINGS (protected) ===
  app.get("/api/settings", requireAuth, async (req, res) => {
    const s = await storage.getSettings();
    res.json(s);
  });

  app.patch("/api/settings", requireAuth, async (req, res) => {
    const updated = await storage.updateSettings(req.body);
    res.json(updated);
  });

  return httpServer;
}

// Seed Function (sequential so file storage isn't written by multiple createRoom at once)
async function seed() {
  const existingRooms = await storage.getRooms();
  if (existingRooms.length === 0) {
    console.log("Seeding database...");
    
    const roomInputs = [
      { roomNumber: "101", type: "Standard", price: 250000, status: "Available" as const, currency: "Kip" as const },
      { roomNumber: "102", type: "Standard", price: 250000, status: "Available" as const, currency: "Kip" as const },
      { roomNumber: "103", type: "Standard", price: 250000, status: "Maintenance" as const, currency: "Kip" as const },
      { roomNumber: "201", type: "Deluxe", price: 450000, status: "Available" as const, currency: "Kip" as const },
      { roomNumber: "202", type: "Deluxe", price: 450000, status: "Available" as const, currency: "Kip" as const },
      { roomNumber: "301", type: "VIP", price: 850000, status: "Available" as const, currency: "Kip" as const },
    ];
    const rooms = [];
    for (const input of roomInputs) {
      rooms.push(await storage.createRoom(input));
    }

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
