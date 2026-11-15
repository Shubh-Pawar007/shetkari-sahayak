import type { Application } from "./types.ts";
import { applyAction, type ActionInput } from "./workflow.ts";

// Storage is behind these few functions so a Postgres implementation can replace the in-memory one
// without touching routes or UI. In-memory is enough for a demo; data resets on cold start.

const day = 86400000;
const ago = (d: number) => new Date(Date.now() - d * day).toISOString();

function mk(p: Partial<Application> & Pick<Application, "id" | "applicantName" | "village" | "crop">, ageDays: number): Application {
  return {
    taluka: "बारामती", surveyNo: String(100 + Math.floor(Math.random() * 400)), cause: "अतिवृष्टी",
    claimedAreaHa: 1.5, landAreaHa: 2, damagePercentClaimed: 60,
    docs: { sevenTwelve: true, aadhaarLinkedBank: true, photos: true, selfDeclaration: true },
    submittedAt: ago(ageDays), step: "verify", status: "pending", stepNotes: {},
    history: [{ at: ago(ageDays), by: "system", type: "created", step: "verify", note: "ऑनलाइन अर्ज प्राप्त" }],
    ...p,
  };
}

function seed(): Application[] {
  const list: Application[] = [
    mk({ id: "KN-1001", applicantName: "रामचंद्र शिंदे", village: "सुपे", crop: "सोयाबीन", surveyNo: "214/2", claimedAreaHa: 1.8, landAreaHa: 2.2, damagePercentClaimed: 70 }, 19),
    mk({ id: "KN-1002", applicantName: "सविता जाधव", village: "मोरगाव", crop: "कांदा", surveyNo: "88", claimedAreaHa: 0.8, landAreaHa: 1.0, damagePercentClaimed: 55, docs: { sevenTwelve: true, aadhaarLinkedBank: false, photos: true, selfDeclaration: true } }, 12),
    mk({ id: "KN-1003", applicantName: "दत्तात्रय पवार", village: "वडगाव निंबाळकर", crop: "ज्वारी", surveyNo: "301/1", claimedAreaHa: 2.5, landAreaHa: 3.5, damagePercentClaimed: 85, step: "inspect", status: "in_progress" }, 16),
    mk({ id: "KN-1004", applicantName: "लता काळे", village: "कऱ्हावागज", crop: "तूर", surveyNo: "45", claimedAreaHa: 1.0, landAreaHa: 1.2, damagePercentClaimed: 40, docs: { sevenTwelve: true, aadhaarLinkedBank: true, photos: false, selfDeclaration: true } }, 8),
    mk({ id: "KN-1005", applicantName: "बाळासाहेब मोरे", village: "सुपे", crop: "बाजरी", surveyNo: "512", claimedAreaHa: 3.5, landAreaHa: 4, damagePercentClaimed: 90, step: "assess", status: "in_progress", inspection: { fieldDamagePercent: 75, inspectedAreaHa: 3.2 } }, 10),
    mk({ id: "KN-1006", applicantName: "सुनिता गायकवाड", village: "मोरगाव", crop: "सोयाबीन", surveyNo: "77/3", claimedAreaHa: 1.2, landAreaHa: 1.5, damagePercentClaimed: 30, step: "inspect", status: "returned" }, 6),
    mk({ id: "KN-1007", applicantName: "अशोक भोसले", village: "जळगाव सुपे", crop: "कापूस", surveyNo: "190", claimedAreaHa: 2.0, landAreaHa: 2.0, damagePercentClaimed: 65, step: "decide", status: "in_progress", inspection: { fieldDamagePercent: 60, inspectedAreaHa: 1.9 }, assessedAmount: 16150 }, 4),
    mk({ id: "KN-1008", applicantName: "मीना कदम", village: "वडगाव निंबाळकर", crop: "कांदा", surveyNo: "63", claimedAreaHa: 0.6, landAreaHa: 0.8, damagePercentClaimed: 50 }, 2),
  ];
  return list;
}

const g = globalThis as unknown as { __apps?: Application[] };
function db(): Application[] {
  if (!g.__apps) g.__apps = seed();
  return g.__apps;
}

export function listApplications(): Application[] { return db(); }
export function getApplication(id: string): Application | undefined { return db().find((a) => a.id === id); }

export function act(id: string, input: ActionInput): Application {
  const all = db();
  const i = all.findIndex((a) => a.id === id);
  if (i < 0) throw new Error("not_found");
  all[i] = applyAction(all[i], input);
  return all[i];
}

export function logAi(id: string, by: string, summary: string): void {
  const a = getApplication(id);
  if (!a) return;
  a.history.push({ at: new Date().toISOString(), by, type: "ai_used", step: a.step, note: summary.slice(0, 200) });
}

