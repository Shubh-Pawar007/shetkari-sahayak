import { scryptSync, timingSafeEqual, createHmac } from "node:crypto";

// Officer accounts. The demo ships with two seeded logins, officer1 and officer2 (Demo@1234).

export interface User { username: string; name: string; role: string; salt: string; hash: string }

function hash(password: string, salt: string): string {
  return scryptSync(password, salt, 32).toString("hex");
}
function mkSeed(username: string, name: string, role: string): User {
  const salt = "seed-" + username;
  return { username, name, role, salt, hash: hash("Demo@1234", salt) };
}
const SEEDS: User[] = [mkSeed("officer1", "अनिल देशमुख", "कृषी सहायक"), mkSeed("officer2", "स्वाती पाटील", "तलाठी")];

export function findUser(username: string): User | null {
  const key = username.toLowerCase();
  return SEEDS.find((s) => s.username === key) ?? null;
}

export async function verifyLogin(username: string, password: string): Promise<User | null> {
  const u = findUser(username.toLowerCase());
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
