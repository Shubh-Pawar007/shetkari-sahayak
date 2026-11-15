import { cookies } from "next/headers";
import { OFFICERS } from "./store.ts";

// Demo-grade auth: the cookie holds only the username. Fine for a test deployment with fake data;
// real use needs signed sessions and the state's identity provider (see README).
export function currentOfficer(): { username: string; name: string } | null {
  const u = cookies().get("officer")?.value;
  if (!u || !OFFICERS[u]) return null;
  return { username: u, name: OFFICERS[u].name };
}
