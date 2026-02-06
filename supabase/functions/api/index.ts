// Hotel Sunin Rooms – Supabase Edge Function (single API)
// Deploy: supabase functions deploy api --no-verify-jwt
// Set secret: supabase secrets set JWT_SECRET=your-secret

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import * as jose from "https://deno.land/x/jose@v5.2.0/index.ts";

const FUNCTION_NAME = "api";

function getPathname(url: string): string {
  const path = new URL(url).pathname;
  const prefix = `/functions/v1/${FUNCTION_NAME}`;
  let p = path;
  if (p.startsWith(prefix)) p = p.slice(prefix.length) || "/";
  else if (p.includes("/api")) p = p.slice(p.indexOf("/api")) || "/";

  // Be forgiving if callers accidentally double-prefix `/api`
  // e.g. `/functions/v1/api/api/api/setup/status` -> `/api/setup/status`
  while (p.startsWith("/api/api/")) p = "/api/" + p.slice("/api/api/".length);
  if (p === "/api/api") p = "/api";

  // Supabase may pass path relative to function (e.g. /setup/status)
  if (p !== "/" && !p.startsWith("/api")) p = "/api" + p;

  return p;
}

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

function jsonResponse(body: unknown, status = 200, headers = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders, ...headers },
  });
}

function errResponse(message: string, status: number): Response {
  return jsonResponse({ message }, status);
}

function getSupabase() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

const JWT_SECRET = new TextEncoder().encode(Deno.env.get("JWT_SECRET") || "change-me");
const JWT_ALG = "HS256";
const JWT_EXP = "7d";

async function signToken(payload: { sub: number; username: string }): Promise<string> {
  return await new jose.SignJWT({ ...payload, username: payload.username })
    .setProtectedHeader({ alg: JWT_ALG })
    .setSubject(String(payload.sub))
    .setExpirationTime(JWT_EXP)
    .sign(JWT_SECRET);
}

async function verifyToken(authHeader: string | null): Promise<{ id: number; username: string } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    const sub = payload.sub;
    const username = payload.username as string;
    if (!sub || !username) return null;
    return { id: Number(sub), username };
  } catch {
    return null;
  }
}

// DB row -> API camelCase
function rowToRoom(r: Record<string, unknown>) {
  return {
    id: r.id,
    roomNumber: r.room_number,
    type: r.type,
    status: r.status,
    price: r.price,
    currency: r.currency,
  };
}

function rowToBooking(r: Record<string, unknown>, room?: Record<string, unknown>) {
  const b: Record<string, unknown> = {
    id: r.id,
    guestName: r.guest_name,
    phone: r.phone,
    roomId: r.room_id,
    checkIn: r.check_in,
    checkOut: r.check_out,
    status: r.status,
    notes: r.notes,
    createdAt: r.created_at,
    totalPrice: r.total_price,
    paymentStatus: r.payment_status,
    invoiceNumber: r.invoice_number,
    identification: r.identification,
    discountAmount: r.discount_amount ?? 0,
  };
  if (room) b.room = rowToRoom(room);
  return b;
}

function rowToSettings(r: Record<string, unknown>) {
  return {
    id: r.id,
    hotelName: r.hotel_name,
    hotelAddress: r.hotel_address,
    hotelPhone: r.hotel_phone,
    hotelLogo: r.hotel_logo,
    taxRate: r.tax_rate,
  };
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const pathname = getPathname(req.url);
  const method = req.method;
  const supabase = getSupabase();

  const authHeader = req.headers.get("Authorization");
  const user = await verifyToken(authHeader);

  const requireAuth = (): Response | null => {
    if (!user) return errResponse("Not authenticated", 401);
    return null;
  };

  // GET /api/ready
  if (method === "GET" && pathname === "/api/ready") {
    return jsonResponse({ ok: true, token: null });
  }

  // GET /api/debug-path – remove in production if desired
  if (method === "GET" && pathname === "/api/debug-path") {
    return jsonResponse({ pathname, rawUrl: req.url });
  }

  // GET /api/me
  if (method === "GET" && pathname === "/api/me") {
    const err = requireAuth();
    if (err) return err;
    return jsonResponse({ id: user!.id, username: user!.username });
  }

  // POST /api/login
  if (method === "POST" && pathname === "/api/login") {
    let body: { username?: string; password?: string };
    try {
      body = await req.json();
    } catch {
      return errResponse("Invalid JSON", 400);
    }
    const username = body.username?.trim();
    const password = body.password;
    if (!username || typeof password !== "string") {
      return errResponse("Username and password required", 400);
    }
    const { data: rows } = await supabase.from("users").select("id, username, password_hash").ilike("username", username);
    const u = rows?.[0];
    if (!u || !(await bcrypt.compare(password, u.password_hash))) {
      return errResponse("Invalid username or password", 401);
    }
    const token = await signToken({ sub: u.id, username: u.username });
    return jsonResponse({ id: u.id, username: u.username, token }, 200);
  }

  // POST /api/logout – no-op
  if (method === "POST" && pathname === "/api/logout") {
    return jsonResponse({ ok: true });
  }

  // GET /api/setup/status
  if (method === "GET" && pathname === "/api/setup/status") {
    const { count } = await supabase.from("users").select("*", { count: "exact", head: true });
    return jsonResponse({ canCreateFirstUser: count === 0 });
  }

  // POST /api/setup
  if (method === "POST" && pathname === "/api/setup") {
    const { count } = await supabase.from("users").select("*", { count: "exact", head: true });
    if (count && count > 0) return errResponse("First user already exists. Sign in instead.", 403);
    let body: { username?: string; password?: string };
    try {
      body = await req.json();
    } catch {
      return errResponse("Invalid JSON", 400);
    }
    const username = body.username?.trim();
    const password = body.password;
    if (!username) return errResponse("Username required", 400);
    if (!password || typeof password !== "string" || password.length < 4) {
      return errResponse("Password required (at least 4 characters)", 400);
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const { data: u, error } = await supabase.from("users").insert({ username, password_hash: passwordHash }).select("id, username").single();
    if (error) return errResponse(error.message || "Failed to create account", 400);
    const token = await signToken({ sub: u.id, username: u.username });
    return jsonResponse({ id: u.id, username: u.username, token }, 201);
  }

  // Protected routes below
  const authErr = requireAuth();
  if (authErr) return authErr;

  // GET /api/rooms (with seed when empty)
  if (method === "GET" && pathname === "/api/rooms") {
    let { data: rows } = await supabase.from("rooms").select("*").order("room_number");
    if (!rows || rows.length === 0) {
      const roomInputs = [
        { room_number: "101", type: "Standard", price: 250000, status: "Available", currency: "Kip" },
        { room_number: "102", type: "Standard", price: 250000, status: "Available", currency: "Kip" },
        { room_number: "103", type: "Standard", price: 250000, status: "Maintenance", currency: "Kip" },
        { room_number: "201", type: "Deluxe", price: 450000, status: "Available", currency: "Kip" },
        { room_number: "202", type: "Deluxe", price: 450000, status: "Available", currency: "Kip" },
        { room_number: "301", type: "VIP", price: 850000, status: "Available", currency: "Kip" },
      ];
      for (const r of roomInputs) {
        await supabase.from("rooms").insert(r);
      }
      const today = new Date().toISOString();
      const tomorrow = new Date(Date.now() + 86400000).toISOString();
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();
      const { data: newRooms } = await supabase.from("rooms").select("id").order("room_number");
      if (newRooms && newRooms.length >= 4) {
        await supabase.from("bookings").insert([
          { guest_name: "John Doe", phone: "555-0101", room_id: newRooms[0].id, check_in: today, check_out: tomorrow, notes: "Early check-in requested", total_price: 250000, payment_status: "Unpaid", status: "checked in" },
          { guest_name: "Alice Smith", phone: "555-0102", room_id: newRooms[3].id, check_in: today, check_out: nextWeek, notes: "VIP Guest", total_price: 3150000, payment_status: "Paid", status: "checked in" },
        ]);
      }
      const { data: afterSeed } = await supabase.from("rooms").select("*").order("room_number");
      rows = afterSeed || [];
    }
    const rooms = (rows || []).map((r: Record<string, unknown>) => rowToRoom(r));
    return jsonResponse(rooms);
  }

  // GET /api/rooms/:id
  const roomsIdMatch = pathname.match(/^\/api\/rooms\/(\d+)$/);
  if (method === "GET" && roomsIdMatch) {
    const id = roomsIdMatch[1];
    const { data: r, error } = await supabase.from("rooms").select("*").eq("id", id).single();
    if (error || !r) return errResponse("Room not found", 404);
    return jsonResponse(rowToRoom(r));
  }

  // POST /api/rooms
  if (method === "POST" && pathname === "/api/rooms") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errResponse("Invalid JSON", 400);
    }
    const { data: r, error } = await supabase
      .from("rooms")
      .insert({
        room_number: body.roomNumber,
        type: body.type,
        status: body.status ?? "Available",
        price: body.price ?? 0,
        currency: body.currency ?? "Kip",
      })
      .select("*")
      .single();
    if (error) return errResponse(error.message || "Failed to create room", 400);
    return jsonResponse(rowToRoom(r), 201);
  }

  // PUT /api/rooms/:id
  if (method === "PUT" && roomsIdMatch) {
    const id = roomsIdMatch[1];
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errResponse("Invalid JSON", 400);
    }
    const updates: Record<string, unknown> = {};
    if (body.roomNumber !== undefined) updates.room_number = body.roomNumber;
    if (body.type !== undefined) updates.type = body.type;
    if (body.status !== undefined) updates.status = body.status;
    if (body.price !== undefined) updates.price = body.price;
    if (body.currency !== undefined) updates.currency = body.currency;
    const { data: r, error } = await supabase.from("rooms").update(updates).eq("id", id).select("*").single();
    if (error) return errResponse(error.message || "Failed to update", 400);
    if (!r) return errResponse("Room not found", 404);
    return jsonResponse(rowToRoom(r));
  }

  // DELETE /api/rooms/:id
  if (method === "DELETE" && roomsIdMatch) {
    const id = roomsIdMatch[1];
    await supabase.from("bookings").delete().eq("room_id", id);
    await supabase.from("rooms").delete().eq("id", id);
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // GET /api/bookings
  if (method === "GET" && pathname === "/api/bookings") {
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const roomId = url.searchParams.get("roomId");
    let q = supabase.from("bookings").select("*, rooms(*)");
    if (roomId) q = q.eq("room_id", roomId);
    if (from) q = q.gte("check_out", from);
    if (to) q = q.lte("check_in", to);
    const { data: rows } = await q.order("check_in", { ascending: true });
    const list = (rows || []).map((b: Record<string, unknown>) => {
      const room = b.rooms as Record<string, unknown> | undefined;
      const { rooms: _, ...booking } = b;
      return rowToBooking(booking, room);
    });
    return jsonResponse(list);
  }

  // GET /api/bookings/:id
  const bookingsIdMatch = pathname.match(/^\/api\/bookings\/(\d+)$/);
  if (method === "GET" && bookingsIdMatch) {
    const id = bookingsIdMatch[1];
    const { data: b, error } = await supabase.from("bookings").select("*, rooms(*)").eq("id", id).single();
    if (error || !b) return errResponse("Booking not found", 404);
    const room = (b as Record<string, unknown>).rooms as Record<string, unknown>;
    const { rooms: _, ...booking } = b as Record<string, unknown>;
    return jsonResponse(rowToBooking(booking, room));
  }

  // POST /api/bookings
  if (method === "POST" && pathname === "/api/bookings") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errResponse("Invalid JSON", 400);
    }
    const checkIn = new Date((body.checkIn as string) || "");
    const checkOut = new Date((body.checkOut as string) || "");
    if (checkOut <= checkIn) return errResponse("Check-out must be after check-in", 400);

    const roomId = Number(body.roomId);
    const { data: roomRow } = await supabase.from("rooms").select("*").eq("id", roomId).single();
    if (!roomRow) return errResponse("Room not found", 400);

    let totalPrice = Number(body.totalPrice) || 0;
    if (totalPrice <= 0) {
      const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24)));
      totalPrice = nights * (roomRow.price as number);
    }

    const from = startOfDay(checkIn);
    const to = startOfDay(checkOut);
    const { data: existing } = await supabase
      .from("bookings")
      .select("id")
      .eq("room_id", roomId)
      .lt("check_in", to)
      .gt("check_out", from);
    if (existing && existing.length > 0) return errResponse("Room is already booked for these dates", 409);

    const { data: b, error } = await supabase
      .from("bookings")
      .insert({
        guest_name: body.guestName,
        phone: body.phone,
        room_id: roomId,
        check_in: checkIn.toISOString(),
        check_out: checkOut.toISOString(),
        status: body.status ?? "reserved",
        notes: body.notes ?? null,
        total_price: totalPrice,
        payment_status: body.paymentStatus ?? "Unpaid",
        invoice_number: body.invoiceNumber ?? null,
        identification: body.identification ?? null,
        discount_amount: body.discountAmount ?? 0,
      })
      .select("*")
      .single();
    if (error) return errResponse(error.message || "Failed to create booking", 400);
    const { data: room } = await supabase.from("rooms").select("*").eq("id", b.room_id).single();
    return jsonResponse(rowToBooking(b, room), 201);
  }

  // PUT /api/bookings/:id
  if (method === "PUT" && bookingsIdMatch) {
    const id = bookingsIdMatch[1];
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errResponse("Invalid JSON", 400);
    }
    const { data: existing } = await supabase.from("bookings").select("*").eq("id", id).single();
    if (!existing) return errResponse("Booking not found", 404);

    const checkIn = body.checkIn != null ? new Date(body.checkIn as string) : new Date(existing.check_in);
    const checkOut = body.checkOut != null ? new Date(body.checkOut as string) : new Date(existing.check_out);
    if (checkOut <= checkIn) return errResponse("Check-out must be after check-in", 400);
    const roomId = Number(body.roomId ?? existing.room_id);

    const from = startOfDay(checkIn);
    const to = startOfDay(checkOut);
    const { data: conflicting } = await supabase
      .from("bookings")
      .select("id")
      .eq("room_id", roomId)
      .neq("id", id)
      .lt("check_in", to)
      .gt("check_out", from);
    if (conflicting && conflicting.length > 0) return errResponse("Room is already booked for these dates", 409);

    const updates: Record<string, unknown> = {
      check_in: checkIn.toISOString(),
      check_out: checkOut.toISOString(),
    };
    if (body.guestName !== undefined) updates.guest_name = body.guestName;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.roomId !== undefined) updates.room_id = body.roomId;
    if (body.status !== undefined) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.totalPrice !== undefined) updates.total_price = body.totalPrice;
    if (body.paymentStatus !== undefined) updates.payment_status = body.paymentStatus;
    if (body.invoiceNumber !== undefined) updates.invoice_number = body.invoiceNumber;
    if (body.identification !== undefined) updates.identification = body.identification;
    if (body.discountAmount !== undefined) updates.discount_amount = body.discountAmount;

    const { data: b, error } = await supabase.from("bookings").update(updates).eq("id", id).select("*").single();
    if (error) return errResponse(error.message || "Failed to update", 400);
    const { data: room } = await supabase.from("rooms").select("*").eq("id", b.room_id).single();
    return jsonResponse(rowToBooking(b, room));
  }

  // DELETE /api/bookings/:id
  if (method === "DELETE" && bookingsIdMatch) {
    const id = bookingsIdMatch[1];
    await supabase.from("bookings").delete().eq("id", id);
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // GET /api/dashboard/stats
  if (method === "GET" && pathname === "/api/dashboard/stats") {
    const today = new Date();
    const startOfDayToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDayToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const { data: rooms } = await supabase.from("rooms").select("id");
    const totalRooms = rooms?.length ?? 0;

    const { data: activeBookings } = await supabase
      .from("bookings")
      .select("id")
      .lte("check_in", endOfDayToday.toISOString())
      .gte("check_out", startOfDayToday.toISOString());
    const occupied = activeBookings?.length ?? 0;

    const { count: checkInsToday } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("check_in", startOfDayToday.toISOString())
      .lt("check_in", endOfDayToday.toISOString());

    const { count: checkOutsToday } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("check_out", startOfDayToday.toISOString())
      .lt("check_out", endOfDayToday.toISOString());

    return jsonResponse({
      totalOccupied: occupied,
      checkInsToday: checkInsToday ?? 0,
      checkOutsToday: checkOutsToday ?? 0,
      availableRooms: totalRooms - occupied,
    });
  }

  // GET /api/settings
  if (method === "GET" && pathname === "/api/settings") {
    const { data: rows } = await supabase.from("settings").select("*").limit(1);
    let s: Record<string, unknown>;
    if (rows && rows.length > 0) {
      s = rowToSettings(rows[0]);
    } else {
      const { data: inserted } = await supabase.from("settings").insert({}).select("*").single();
      s = rowToSettings(inserted || {});
    }
    return jsonResponse(s);
  }

  // PATCH /api/settings
  if (method === "PATCH" && pathname === "/api/settings") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errResponse("Invalid JSON", 400);
    }
    const { data: existing } = await supabase.from("settings").select("*").limit(1).single();
    const updates: Record<string, unknown> = {};
    if (body.hotelName !== undefined) updates.hotel_name = body.hotelName;
    if (body.hotelAddress !== undefined) updates.hotel_address = body.hotelAddress;
    if (body.hotelPhone !== undefined) updates.hotel_phone = body.hotelPhone;
    if (body.hotelLogo !== undefined) updates.hotel_logo = body.hotelLogo;
    if (body.taxRate !== undefined) updates.tax_rate = body.taxRate;

    if (existing) {
      const { data: s, error } = await supabase.from("settings").update(updates).eq("id", existing.id).select("*").single();
      if (error) return errResponse(error.message || "Failed to update", 400);
      return jsonResponse(rowToSettings(s || existing));
    } else {
      const { data: s, error } = await supabase.from("settings").insert(updates).select("*").single();
      if (error) return errResponse(error.message || "Failed to create settings", 400);
      return jsonResponse(rowToSettings(s || {}));
    }
  }

  return errResponse("Not Found", 404);
});
