import { NextResponse } from "next/server";
import { createUser, validate, sign } from "@/lib/users.ts";

export async function POST(req: Request) {
  const form = await req.formData();
  const input = {
    name: String(form.get("name") ?? ""),
    role: String(form.get("role") ?? ""),
    username: String(form.get("username") ?? "").trim().toLowerCase(),
    password: String(form.get("password") ?? ""),
  };
  const url = new URL(req.url);
  const bad = validate(input);
  if (bad) return NextResponse.redirect(new URL(`/signup?error=${bad}`, url), 303);
  if ((await createUser(input)) === "exists") return NextResponse.redirect(new URL("/signup?error=exists", url), 303);
  // Signed in straight after sign-up.
  const res = NextResponse.redirect(new URL("/", url), 303);
  res.cookies.set("officer", sign(input.username), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  return res;
}
