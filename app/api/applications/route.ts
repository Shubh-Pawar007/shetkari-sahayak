import { NextResponse } from "next/server";
import { currentOfficer } from "@/lib/auth.ts";
import { listApplications } from "@/lib/store.ts";
import { priorityScore } from "@/lib/workflow.ts";

export async function GET() {
  if (!(await currentOfficer())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const list = listApplications().map((a) => ({ ...a, priority: priorityScore(a) })).sort((x, y) => y.priority - x.priority);
  return NextResponse.json(list);
}
