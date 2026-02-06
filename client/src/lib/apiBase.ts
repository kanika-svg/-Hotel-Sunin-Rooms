/**
 * When the frontend is hosted elsewhere (e.g. Netlify), set VITE_API_URL to the backend origin (e.g. https://hotel-sunin-rooms.onrender.com).
 * Leave unset when frontend and API are on the same origin.
 */
const base =
  typeof import.meta.env.VITE_API_URL === "string"
    ? import.meta.env.VITE_API_URL.replace(/\/$/, "")
    : "";

export function apiUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return base ? base + path : path;
}
