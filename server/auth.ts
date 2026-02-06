import session from "express-session";
import type { Request, Response, NextFunction } from "express";

const SESSION_SECRET = process.env.SESSION_SECRET || "hotel-sunin-change-in-production";

export const sessionMiddleware = session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: "hotel_sunin_sid",
  cookie: {
    httpOnly: true,
    // Secure required for HTTPS. When ALLOWED_ORIGIN is set (cross-origin frontend), use sameSite: "none" so cookies are sent.
    secure: process.env.SESSION_SECURE === "true",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: process.env.ALLOWED_ORIGIN ? "none" : "lax",
  },
});

declare module "express-session" {
  interface SessionData {
    user: { id: number; username: string; displayName?: string };
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.user) {
    next();
    return;
  }
  res.status(401).json({ message: "Not authenticated" });
}
