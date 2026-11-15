import { NextResponse } from "next/server";
import { currentOfficer } from "@/lib/auth.ts";
import { act } from "@/lib/store.ts";
import { WorkflowError } from "@/lib/workflow.ts";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const o = await currentOfficer();
  if (!o) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || !["advance", "return", "approve", "reject"].includes(body.action))
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  try {
    const a = act(params.id, {
      action: body.action,
      by: o.username,
      note: typeof body.note === "string" ? body.note.slice(0, 1000) : undefined,
      inspection: body.inspection
        ? { fieldDamagePercent: Number(body.inspection.fieldDamagePercent), inspectedAreaHa: Number(body.inspection.inspectedAreaHa) }
        : undefined,
      assessedAmount: body.assessedAmount !== undefined && body.assessedAmount !== "" ? Number(body.assessedAmount) : undefined,
    });
    return NextResponse.json(a);
  } catch (e) {
    if (e instanceof WorkflowError) return NextResponse.json({ error: e.message }, { status: 422 });
    if ((e as Error).message === "not_found") return NextResponse.json({ error: "not_found" }, { status: 404 });
    throw e;
  }
}
