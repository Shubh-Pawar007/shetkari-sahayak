export type StepKey = "verify" | "inspect" | "assess" | "decide";
export const STEPS: StepKey[] = ["verify", "inspect", "assess", "decide"];

export type Status = "pending" | "in_progress" | "returned" | "approved" | "rejected";

export interface HistoryEvent {
  at: string; // ISO
  by: string; // officer username or "system"
  type: "created" | "advanced" | "returned" | "approved" | "rejected" | "ai_used" | "note";
  step: StepKey;
  note?: string;
}

export interface Application {
  id: string;
  applicantName: string;
  village: string;
  taluka: string;
  surveyNo: string; // gat/survey number
  crop: string;
  cause: string; // e.g. unseasonal rain
  claimedAreaHa: number; // area claimed damaged
  landAreaHa: number; // total registered land (7/12)
  damagePercentClaimed: number;
  docs: { sevenTwelve: boolean; aadhaarLinkedBank: boolean; photos: boolean; selfDeclaration: boolean };
  submittedAt: string;
  step: StepKey;
  status: Status;
  stepNotes: Partial<Record<StepKey, string>>;
  inspection?: { fieldDamagePercent: number; inspectedAreaHa: number };
  assessedAmount?: number;
  history: HistoryEvent[];
}

export type Action = "advance" | "return" | "approve" | "reject";
