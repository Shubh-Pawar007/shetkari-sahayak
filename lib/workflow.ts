import { STEPS } from "./types.ts";
import type { Application, Action, HistoryEvent, StepKey } from "./types.ts";

// Rule used for the demo: compensation per hectare for damaged crop, capped at 3 ha per farmer.
// Real rates come from the state government notification; keep it configurable.
export const RATE_PER_HA = 8500; // INR, dry-land crop (demo value)
export const MAX_AREA_HA = 3;
export const SLA_DAYS = 14;

export function daysSince(iso: string, now = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86400000));
}

export function missingDocs(a: Application): string[] {
  return Object.entries(a.docs).filter(([, ok]) => !ok).map(([k]) => k);
}

/** Suggested amount from the field inspection. Worker confirms or changes it. */
export function suggestAmount(a: Application): number {
  if (!a.inspection) return 0;
  const { fieldDamagePercent, inspectedAreaHa } = a.inspection;
  // Only damage of 33% or more is compensable under the usual norm.
  if (fieldDamagePercent < 33) return 0;
  const area = Math.min(inspectedAreaHa, a.landAreaHa, MAX_AREA_HA);
  return Math.round(area * RATE_PER_HA);
}

/** Higher score = look at it first. */
export function priorityScore(a: Application, now = new Date()): number {
  if (a.status === "approved" || a.status === "rejected") return -1;
  const age = daysSince(a.submittedAt, now);
  let s = age * 3;
  if (age > SLA_DAYS) s += 40;
  if (a.status === "returned") s += 10;
  if (missingDocs(a).length === 0 && a.step === "verify") s += 5; // easy win
  s += a.damagePercentClaimed / 10;
  return Math.round(s);
}

export function isFinal(a: Application) {
  return a.status === "approved" || a.status === "rejected";
}

export class WorkflowError extends Error {}

export interface ActionInput {
  action: Action;
  by: string;
  note?: string;
  inspection?: { fieldDamagePercent: number; inspectedAreaHa: number };
  assessedAmount?: number;
}

/** Pure transition: returns the updated application, never mutates the input. */
export function applyAction(app: Application, input: ActionInput, now = new Date()): Application {
  if (isFinal(app)) throw new WorkflowError("final");
  const a: Application = JSON.parse(JSON.stringify(app));
  const note = (input.note ?? "").trim();
  const evt = (type: HistoryEvent["type"]): void => {
    a.history.push({ at: now.toISOString(), by: input.by, type, step: app.step, note: note || undefined });
  };
  if (note) a.stepNotes[app.step] = note;
  const idx = STEPS.indexOf(a.step);

  switch (input.action) {
    case "return":
      if (!note) throw new WorkflowError("reason_required");
      evt("returned");
      a.status = "returned";
      a.step = idx > 0 ? STEPS[idx - 1] : STEPS[0]; // goes one step back, or to applicant at step 1
      return a;

    case "reject":
      if (!note) throw new WorkflowError("reason_required");
      evt("rejected");
      a.status = "rejected";
      return a;

    case "advance": {
      if (a.step === "decide") throw new WorkflowError("use_approve");
      if (a.step === "verify" && missingDocs(a).length > 0) throw new WorkflowError("docs_missing");
      if (a.step === "inspect") {
        const i = input.inspection;
        if (!i || i.fieldDamagePercent < 0 || i.fieldDamagePercent > 100 || i.inspectedAreaHa <= 0)
          throw new WorkflowError("inspection_invalid");
        a.inspection = i;
        a.assessedAmount = suggestAmount(a);
      }
      if (a.step === "assess") {
        if (input.assessedAmount === undefined || input.assessedAmount < 0) throw new WorkflowError("amount_invalid");
        a.assessedAmount = Math.round(input.assessedAmount);
      }
      evt("advanced");
      a.status = "in_progress";
      a.step = STEPS[idx + 1];
      return a;
    }

    case "approve":
      if (a.step !== "decide") throw new WorkflowError("not_final_step");
      if (!a.inspection || a.assessedAmount === undefined) throw new WorkflowError("incomplete");
      evt("approved");
      a.status = "approved";
      return a;
  }
}
