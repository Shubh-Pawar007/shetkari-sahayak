import Link from "next/link";
import { redirect } from "next/navigation";
import { currentOfficer } from "@/lib/auth.ts";
import { listApplications } from "@/lib/store.ts";
import { daysSince, priorityScore, SLA_DAYS, isFinal } from "@/lib/workflow.ts";
import { mr, stepLabel, statusLabel } from "@/lib/i18n.ts";

export const dynamic = "force-dynamic";

export default function Home() {
  if (!currentOfficer()) redirect("/login");
  const apps = listApplications()
    .map((a) => ({ a, p: priorityScore(a) }))
    .sort((x, y) => y.p - x.p);
  const open = apps.filter(({ a }) => !isFinal(a));
  const overdue = open.filter(({ a }) => daysSince(a.submittedAt) > SLA_DAYS).length;
  const returned = open.filter(({ a }) => a.status === "returned").length;
  const topIds = new Set(open.slice(0, 3).map(({ a }) => a.id));

  return (
    <>
      <h2>{mr.overview}</h2>
      <div className="row">
        <div className="card stat"><b>{open.length}</b>{mr.pending}</div>
        <div className="card stat"><b className={overdue ? "bad" : ""}>{overdue}</b>{mr.overdue} ({SLA_DAYS}+ दिवस)</div>
        <div className="card stat"><b>{returned}</b>{mr.returnedCount}</div>
      </div>
      {open.length === 0 && <p>{mr.noPending}</p>}
      {apps.map(({ a }) => {
        const age = daysSince(a.submittedAt);
        return (
          <div key={a.id} className={`card app ${topIds.has(a.id) ? "top" : ""}`}>
            <div>
              <strong>{a.applicantName}</strong> <small>({a.id})</small>
              {topIds.has(a.id) && <> <span className="badge late">{mr.needsAttention}</span></>}
              <div>{a.village}, {a.crop} - {isFinal(a) ? "" : stepLabel[a.step]}</div>
              <small>{age} {mr.daysWaiting}</small>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span className={`badge ${a.status}`}>{statusLabel[a.status]}</span>
              <Link className="btn sec" href={`/application/${a.id}`}>{mr.open}</Link>
            </div>
          </div>
        );
      })}
    </>
  );
}
