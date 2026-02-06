import fs from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import { getAppRoot } from "./appRoot";

export type User = {
  id: number;
  username: string;
  passwordHash: string;
  displayName?: string;
};

type UsersFile = {
  users: User[];
  nextId: number;
};

const USERS_DIR = process.env.HOTEL_SUNIN_DATA_DIR
  ? process.env.HOTEL_SUNIN_DATA_DIR
  : path.join(getAppRoot(), ".");
const USERS_FILE = path.join(USERS_DIR, "users.json");

const defaultUsersFile = (): UsersFile => ({
  users: [],
  nextId: 1,
});

async function readUsersFile(): Promise<UsersFile> {
  try {
    const raw = await fs.readFile(USERS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as UsersFile;
    if (!parsed?.users || !Array.isArray(parsed.users)) return defaultUsersFile();
    if (typeof parsed.nextId !== "number") parsed.nextId = 1;
    return parsed;
  } catch {
    return defaultUsersFile();
  }
}

async function writeUsersFile(data: UsersFile): Promise<void> {
  await fs.mkdir(USERS_DIR, { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function findUserByUsername(username: string): Promise<User | undefined> {
  const data = await readUsersFile();
  return data.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export async function createUser(
  username: string,
  password: string,
  displayName?: string
): Promise<User> {
  const data = await readUsersFile();
  if (data.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error("Username already exists");
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user: User = {
    id: data.nextId++,
    username,
    passwordHash,
    displayName,
  };
  data.users.push(user);
  await writeUsersFile(data);
  const { passwordHash: _, ...publicUser } = user;
  return user;
}

export function toPublicUser(user: User): { id: number; username: string; displayName?: string } {
  return { id: user.id, username: user.username, displayName: user.displayName };
}
