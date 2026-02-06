-- Hotel Sunin Rooms: initial schema for Supabase Postgres
-- Run this in Supabase SQL Editor or via: supabase db push

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  room_number TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Available',
  price INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'Kip'
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  guest_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  check_in TIMESTAMPTZ NOT NULL,
  check_out TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  total_price INTEGER NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'Unpaid',
  invoice_number TEXT UNIQUE,
  identification TEXT,
  discount_amount INTEGER NOT NULL DEFAULT 0
);

-- Settings (single row)
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  hotel_name TEXT NOT NULL DEFAULT 'Sunin Hotel',
  hotel_address TEXT NOT NULL DEFAULT 'Vientiane, Lao PDR',
  hotel_phone TEXT NOT NULL DEFAULT '+856 20 1234 5678',
  hotel_logo TEXT,
  tax_rate INTEGER NOT NULL DEFAULT 0
);

-- Users (for custom auth)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users(LOWER(username));
