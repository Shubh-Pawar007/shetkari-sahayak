"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { mr } from "@/lib/i18n.ts";
import type { StepKey } from "@/lib/types.ts";

const ERR: Record<string, string> = {
  reason_required: mr.reasonRequired,
  docs_missing: "कागदपत्रे अपूर्ण आहेत. अर्ज परत पाठवा.",
  inspection_invalid: "पाहणीची माहिती तपासा (नुकसान ०-१००%, क्षेत्र > ०).",
  amount_invalid: "रक्कम तपासा.",
  final: mr.finalState,
};

export default function ActionPanel(props: {
  id: string;
  step: StepKey;
  suggested: number;
  current: { damage?: number; area?: number; amount?: number };
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [damage, setDamage] = useState(props.current.damage?.toString() ?? "");
  const [area, setArea] = useState(props.current.area?.toString() ?? "");
  const [amount, setAmount] = useState((props.current.amount ?? props.suggested).toString());
  const [ai, setAi] = useState<{ source: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function askAi() {
    setBusy(true); setErr("");
    const r = await fetch(`/api/applications/${props.id}/assist`, { method: "POST" });
    setBusy(false);
    if (r.ok) { setAi(await r.json()); router.refresh(); } else setErr("AI सहाय्य उपलब्ध नाही");
  }

  async function submit(action: "advance" | "return" | "approve" | "reject") {
    setBusy(true); setErr("");
    const body: Record<string, unknown> = { action, note };
    if (props.step === "inspect" && action === "advance") body.inspection = { fieldDamagePercent: damage, inspectedAreaHa: area };
    if (props.step === "assess" && action === "advance") body.assessedAmount = amount;
    const r = await fetch(`/api/applications/${props.id}/action`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    setBusy(false);
    if (r.ok) { setNote(""); setAi(null); router.refresh(); return; }
    const j = await r.json().catch(() => ({}));
    setErr(ERR[j.error] ?? "त्रुटी आली, पुन्हा प्रयत्न करा");
  }

  return (
    <div>
      <p>
        <button className="btn sec" onClick={askAi} disabled={busy}>{busy && !ai ? mr.aiThinking : `AI · ${mr.aiHelp}`}</button>
      </p>
      {ai && (
        <div className="card ai">
          <strong>{mr.aiTitle}</strong>
          <div>{ai.text}</div>
          <small>{mr.aiDisclaimer} ({ai.source === "gemini" ? "Gemini" : "नियम-आधारित"})</small>
        </div>
      )}

      {props.step === "inspect" && (
        <div className="grid">
          <div><label htmlFor="d">{mr.fieldDamage}</label><input id="d" inputMode="decimal" value={damage} onChange={(e) => setDamage(e.target.value)} /></div>
          <div><label htmlFor="ar">{mr.inspectedArea}</label><input id="ar" inputMode="decimal" value={area} onChange={(e) => setArea(e.target.value)} /></div>
        </div>
      )}
      {props.step === "assess" && (
        <div>
          <label htmlFor="am">{mr.assessedAmount} ({mr.assess}: ₹{props.suggested.toLocaleString("en-IN")})</label>
          <input id="am" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      )}

      <label htmlFor="n">{mr.notes}</label>
      <textarea id="n" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      {err && <p className="err">{err}</p>}

      <p className="row">
        {props.step === "decide"
          ? <button className="btn" disabled={busy} onClick={() => submit("approve")}>{mr.approve}</button>
          : <button className="btn" disabled={busy} onClick={() => submit("advance")}>{mr.advance}</button>}
        <button className="btn amber" disabled={busy} onClick={() => submit("return")}>{mr.returnBack}</button>
        <button className="btn red" disabled={busy} onClick={() => submit("reject")}>{mr.reject}</button>
      </p>
    </div>
  );
}
