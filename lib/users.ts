import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "node:crypto";

// Officer accounts. Seeded demo logins always work. New sign-ups are kept in Netlify Blobs when
// running on Netlify (so they survive between serverless instances) and in memory otherwise.

export interface User { username: string; name: string; role: string; salt: string; hash: string }

export const ROLES = ["कृषी सहायक", "तलाठी", "ग्रामसेवक", "मंडळ अधिकारी"] as const;

function hash(password: string, salt: string): string {
  return scryptSync(password, salt, 32).toString("hex");
}
function mkSeed(username: string, name: string, role: string): User {
  const salt = "seed-" + username;
  return { username, name, role, salt, hash: hash("Demo@1234", salt) };
}
const SEEDS: User[] = [mkSeed("officer1", "अनिल देशमुख", "कृषी सहायक"), mkSeed("officer2", "स्वाती पाटील", "तलाठी")];

const g = globalThis as unknown as { __users?: Map<string, User> };
function mem(): Map<string, User> {
  if (!g.__users) g.__users = new Map();
  return g.__users;
}

async function blobs() {
  if (!process.env.NETLIFY) return null;
  const { getStore } = await import("@netlify/blobs");
  return getStore("officers");
}

export async function findUser(username: string): Promise<User | null> {
  const key = username.toLowerCase();
  const seed = SEEDS.find((s) => s.username === key);
  if (seed) return seed;
  const m = mem().get(key);
  if (m) return m;
  const store = await blobs();
  if (store) {
    const u = (await store.get(key, { type: "json" })) as User | null;
    if (u) { mem().set(key, u); return u; }
  }
  return null;
}

export function validate(input: { username: string; password: string; name: string; role: string }): string | null {
  if (input.name.trim().length < 2) return "name";
  if (!/^[a-z0-9_]{4,20}$/.test(input.username)) return "username";
  if (input.password.length < 8) return "password";
  if (!(ROLES as readonly string[]).includes(input.role)) return "role";
  return null;
}

export async function createUser(input: { username: string; password: string; name: string; role: string }): Promise<"ok" | "exists"> {
  const username = input.username.toLowerCase();
  if (await findUser(username)) return "exists";
  const salt = randomBytes(16).toString("hex");
  const user: User = { username, name: input.name.trim().slice(0, 60), role: input.role, salt, hash: hash(input.password, salt) };
  mem().set(username, user);
  const store = await blobs();
  if (store) await store.setJSON(username, user);
  return "ok";
}

export async function verifyLogin(username: string, password: string): Promise<User | null> {
  const u = await findUser(username.toLowerCase());
  if (!u) return null;
  const a = Buffer.from(hash(password, u.salt), "hex");
  const b = Buffer.from(u.hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b) ? u : null;
}

// Signed session cookie: "username.signature". Prevents someone from typing another username into the cookie.
const SECRET = process.env.SESSION_SECRET || "demo-only-secret-change-me";
export function sign(username: string): string {
  return `${username}.${createHmac("sha256", SECRET).update(username).digest("hex").slice(0, 32)}`;
}
export function unsign(cookie: string | undefined): string | null {
  if (!cookie) return null;
  const i = cookie.lastIndexOf(".");
  if (i < 1) return null;
  const u = cookie.slice(0, i);
  return sign(u) === cookie ? u : null;
}
