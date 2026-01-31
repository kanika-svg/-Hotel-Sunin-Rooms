import { z } from 'zod';
import { insertRoomSchema, insertBookingSchema, rooms, bookings } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  conflict: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  rooms: {
    list: {
      method: 'GET' as const,
      path: '/api/rooms',
      responses: {
        200: z.array(z.custom<typeof rooms.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/rooms/:id',
      responses: {
        200: z.custom<typeof rooms.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/rooms',
      input: insertRoomSchema,
      responses: {
        201: z.custom<typeof rooms.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/rooms/:id',
      input: insertRoomSchema.partial(),
      responses: {
        200: z.custom<typeof rooms.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/rooms/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  bookings: {
    list: {
      method: 'GET' as const,
      path: '/api/bookings',
      input: z.object({
        search: z.string().optional(),
        from: z.string().optional(), // ISO Date string
        to: z.string().optional(),   // ISO Date string
        roomId: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof bookings.$inferSelect & { room: typeof rooms.$inferSelect }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/bookings/:id',
      responses: {
        200: z.custom<typeof bookings.$inferSelect & { room: typeof rooms.$inferSelect }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/bookings',
      input: insertBookingSchema,
      responses: {
        201: z.custom<typeof bookings.$inferSelect>(),
        400: errorSchemas.validation,
        409: errorSchemas.conflict, // Double booking
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/bookings/:id',
      input: insertBookingSchema.partial(),
      responses: {
        200: z.custom<typeof bookings.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
        409: errorSchemas.conflict,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/bookings/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  dashboard: {
    stats: {
      method: 'GET' as const,
      path: '/api/dashboard/stats',
      responses: {
        200: z.object({
          totalOccupied: z.number(),
          checkInsToday: z.number(),
          checkOutsToday: z.number(),
          availableRooms: z.number(),
        }),
      },
    },
  },
};

// ============================================
// HELPER
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
