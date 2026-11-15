import { NextResponse } from "next/server";
import { verifyLogin, sign } from "@/lib/users.ts";

export async function POST(req: Request) {
  const form = await req.formData();
  const u = String(form.get("username") ?? "").trim().toLowerCase();
  const p = String(form.get("password") ?? "");
  const url = new URL(req.url);
  const user = await verifyLogin(u, p);
  if (!user) return NextResponse.redirect(new URL("/login?error=1", url), 303);
  const res = NextResponse.redirect(new URL("/", url), 303);
  res.cookies.set("officer", sign(user.username), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  return res;
}
