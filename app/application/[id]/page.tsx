import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentOfficer } from "@/lib/auth.ts";
import { getApplication } from "@/lib/store.ts";
import { isFinal, suggestAmount } from "@/lib/workflow.ts";
import { STEPS } from "@/lib/types.ts";
import { mr, stepLabel, stepHint, statusLabel, eventLabel } from "@/lib/i18n.ts";
import ActionPanel from "@/components/ActionPanel.tsx";

export const dynamic = "force-dynamic";

export default async function Detail({ params }: { params: { id: string } }) {
  if (!(await currentOfficer())) redirect("/login");
  const a = getApplication(params.id);
  if (!a) notFound();
  const cur = STEPS.indexOf(a.step);
  const docKeys = Object.keys(a.docs) as (keyof typeof a.docs)[];
  const history = [...a.history].reverse();

  return (
    <>
      <p><Link className="btn sec" href="/">← {mr.back}</Link></p>
      <h2>{a.applicantName} <small>({a.id})</small> <span className={`badge ${a.status}`}>{statusLabel[a.status]}</span></h2>

      <div className="steps">
        {STEPS.map((s, i) => (
          <span key={s} className={isFinal(a) || i < cur ? "done" : i === cur ? "cur" : ""}>{stepLabel[s]}</span>
        ))}
      </div>

      <div className="card">
        <h3>{mr.details}</h3>
        <div className="grid">
          <div><small>{mr.village}</small>{a.village}, {a.taluka}</div>
          <div><small>{mr.survey}</small>{a.surveyNo}</div>
          <div><small>{mr.crop}</small>{a.crop}</div>
          <div><small>{mr.cause}</small>{a.cause}</div>
          <div><small>{mr.claimedArea}</small>{a.claimedAreaHa}</div>
          <div><small>{mr.landArea}</small>{a.landAreaHa}</div>
          <div><small>{mr.claimedDamage}</small>{a.damagePercentClaimed}%</div>
          {a.inspection && <div><small>{mr.fieldDamage}</small>{a.inspection.fieldDamagePercent}% ({a.inspection.inspectedAreaHa} हे.)</div>}
          {a.assessedAmount !== undefined && <div><small>{mr.assessedAmount}</small>₹{a.assessedAmount.toLocaleString("en-IN")}</div>}
        </div>
        <h4>{mr.docs}</h4>
        <div className="grid">
          {docKeys.map((k) => (
            <div key={k} className={a.docs[k] ? "ok" : "bad"}>
              {a.docs[k] ? "✔" : "✘"} {mr[`doc_${k}` as const]} - {a.docs[k] ? mr.present : mr.missing}
            </div>
          ))}
        </div>
      </div>

      {isFinal(a) ? (
        <div className="card"><strong>{mr.finalState}: {statusLabel[a.status]}</strong></div>
      ) : (
        <div className="card">
          <h3>{stepLabel[a.step]}</h3>
          <p>{stepHint[a.step]}</p>
          <ActionPanel
            id={a.id}
            step={a.step}
            suggested={suggestAmount(a)}
            current={{ damage: a.inspection?.fieldDamagePercent, area: a.inspection?.inspectedAreaHa, amount: a.assessedAmount }}
          />
        </div>
      )}

      <div className="card">
        <h3>{mr.history}</h3>
        <ul className="hist">
          {history.map((h, i) => (
            <li key={i}>
              <strong>{eventLabel[h.type]}</strong> - {stepLabel[h.step]}
              <br /><small>{new Date(h.at).toLocaleString("mr-IN", { timeZone: "Asia/Kolkata" })} · {mr.by} {h.by}</small>
              {h.note && <div>{h.note}</div>}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
