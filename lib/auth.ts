import { cookies } from "next/headers";
import { findUser, unsign } from "./users.ts";

export async function currentOfficer(): Promise<{ username: string; name: string } | null> {
  const u = unsign(cookies().get("officer")?.value);
  if (!u) return null;
  const user = await findUser(u);
  if (!user) return null;
  return { username: user.username, name: `${user.role} - ${user.name}` };
}
