import { NextResponse } from "next/server";
import { OFFICERS } from "@/lib/store.ts";

export async function POST(req: Request) {
  const form = await req.formData();
  const u = String(form.get("username") ?? "");
  const p = String(form.get("password") ?? "");
  const o = OFFICERS[u];
  const url = new URL(req.url);
  if (!o || o.password !== p) return NextResponse.redirect(new URL("/login?error=1", url), 303);
  const res = NextResponse.redirect(new URL("/", url), 303);
  res.cookies.set("officer", u, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  return res;
}
