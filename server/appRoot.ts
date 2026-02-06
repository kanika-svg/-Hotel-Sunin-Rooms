import path from "path";

/**
 * Root folder for the app:
 * - When run inside Electron (packaged): app.asar (parent of dist)
 * - When run as HotelSuninRooms.exe: folder containing the exe
 * - When run with Node: project root (parent of dist)
 */
export function getAppRoot(): string {
  if (typeof process.versions !== "undefined" && process.versions.electron) {
    return path.resolve(__dirname, "..");
  }
  const exe = process.execPath.toLowerCase();
  if (exe.endsWith("hotelsuninrooms.exe")) {
    return path.dirname(process.execPath);
  }
  return path.resolve(__dirname, "..");
}
