import test from "node:test";
import assert from "node:assert/strict";
import { applyAction, suggestAmount, priorityScore, WorkflowError, RATE_PER_HA } from "../lib/workflow.ts";
import type { Application } from "../lib/types.ts";

const base = (): Application => ({
  id: "t1", applicantName: "A", village: "V", taluka: "T", surveyNo: "1", crop: "सोयाबीन", cause: "अतिवृष्टी",
  claimedAreaHa: 2, landAreaHa: 2.5, damagePercentClaimed: 60,
  docs: { sevenTwelve: true, aadhaarLinkedBank: true, photos: true, selfDeclaration: true },
  submittedAt: "2026-11-01T00:00:00Z", step: "verify", status: "pending", stepNotes: {}, history: [],
});

test("happy path goes through 4 steps and approves with a full history", () => {
  let a = applyAction(base(), { action: "advance", by: "o1" });
  assert.equal(a.step, "inspect");
  a = applyAction(a, { action: "advance", by: "o1", inspection: { fieldDamagePercent: 60, inspectedAreaHa: 2 } });
  assert.equal(a.step, "assess");
  assert.equal(a.assessedAmount, 2 * RATE_PER_HA);
  a = applyAction(a, { action: "advance", by: "o1", assessedAmount: 17000 });
  assert.equal(a.step, "decide");
  a = applyAction(a, { action: "approve", by: "o1", note: "ok" });
  assert.equal(a.status, "approved");
  assert.equal(a.history.length, 4);
});

test("cannot advance verify with missing documents", () => {
  const a = base(); a.docs.photos = false;
  assert.throws(() => applyAction(a, { action: "advance", by: "o1" }), WorkflowError);
});

test("return and reject need a reason", () => {
  assert.throws(() => applyAction(base(), { action: "return", by: "o1" }), WorkflowError);
  assert.throws(() => applyAction(base(), { action: "reject", by: "o1", note: " " }), WorkflowError);
  const r = applyAction(base(), { action: "return", by: "o1", note: "फोटो नाहीत" });
  assert.equal(r.status, "returned");
});

test("damage under 33% gives zero suggestion; area capped at 3 ha", () => {
  const a = base(); a.inspection = { fieldDamagePercent: 20, inspectedAreaHa: 2 };
  assert.equal(suggestAmount(a), 0);
  a.landAreaHa = 10; a.inspection = { fieldDamagePercent: 80, inspectedAreaHa: 6 };
  assert.equal(suggestAmount(a), 3 * RATE_PER_HA);
});

test("final applications cannot change and have lowest priority", () => {
  const a = applyAction(base(), { action: "reject", by: "o1", note: "बनावट" });
  assert.throws(() => applyAction(a, { action: "advance", by: "o1" }));
  assert.equal(priorityScore(a), -1);
});

test("older applications rank higher", () => {
  const now = new Date("2026-11-15T00:00:00Z");
  const old = base(); const fresh = { ...base(), submittedAt: "2026-11-14T00:00:00Z" };
  assert.ok(priorityScore(old, now) > priorityScore(fresh, now));
});
