import { NextResponse } from "next/server";
import { currentOfficer } from "@/lib/auth.ts";
import { getApplication, logAi } from "@/lib/store.ts";
import { assist } from "@/lib/ai.ts";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const o = await currentOfficer();
  if (!o) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const a = getApplication(params.id);
  if (!a) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const r = await assist(a);
  logAi(a.id, o.username, `${r.source}`);
  return NextResponse.json(r);
}
