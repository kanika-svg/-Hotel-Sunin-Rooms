/**
 * When the frontend is hosted elsewhere (e.g. Netlify), set VITE_API_URL to the backend origin.
 * For Supabase Edge Function: https://<project-ref>.supabase.co/functions/v1/api
 */
const base =
  typeof import.meta.env.VITE_API_URL === "string"
    ? import.meta.env.VITE_API_URL.replace(/\/$/, "")
    : "";

export function apiUrl(path: string): string {
  if (path.startsWith("http")) return path;
  if (!base) return path;
  // Supabase function base already ends with /api; avoid double /api in path
  if (path.startsWith("/api/") && base.endsWith("/api")) return base + path.slice(4);
  return base + path;
}

const TOKEN_KEY = "hotel_sunin_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

/** Headers to send for authenticated requests (Bearer JWT). */
export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
