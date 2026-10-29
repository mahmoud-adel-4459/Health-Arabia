import { useEffect, useState } from "react";
import type { AdminOverview, OverviewTrends } from "../types";
import { getAdminOverview } from "../api";
import { useRouter } from "../router";
import { ErrorState, LoadingState } from "../components/ui";
import { formatDate } from "../lib/format";

const RANGES = [7, 30, 90] as const;

interface ActionTile {
  label: string;
  value: number;
  hint: string;
  to: string;
}

// ---------------------------------------------------------------- small chart pieces (real data only)
function DailyBars({ days }: { days: OverviewTrends["applicationsPerDay"] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const W = 600, H = 150, gap = days.length > 45 ? 1 : 3;
  const barW = (W - gap * (days.length - 1)) / days.length;
  return (
    <>
      <svg className="ovBars" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Applications received per day, from ${formatDate(days[0]?.date)} to ${formatDate(days[days.length - 1]?.date)}`}>
        {[0.5, 1].map((f) => <line key={f} x1="0" x2={W} y1={H - (H - 8) * f} y2={H - (H - 8) * f} stroke="#e2e8f0" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
        {days.map((d, i) => {
          const h = d.count === 0 ? 0 : Math.max(3, ((H - 8) * d.count) / max);
          return (
            <rect key={d.date} x={i * (barW + gap)} y={H - h} width={barW} height={h} rx="2" fill="#0d9488">
              <title>{`${formatDate(d.date)}: ${d.count} application${d.count === 1 ? "" : "s"}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="ovAxis"><span>{formatDate(days[0]?.date)}</span><span>Busiest day: {max}</span><span>{formatDate(days[days.length - 1]?.date)}</span></div>
    </>
  );
}

function BarList({ rows, total, onRow }: { rows: Array<{ key: string; label: string; value: number }>; total?: number; onRow?: (key: string) => void }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="ovList">
      {rows.map((r) => {
        const inner = (
          <>
            <span className="ovListLabel">{r.label}</span>
            <span className="ovListValue">{r.value}{total ? ` · ${Math.round((r.value / total) * 100)}%` : ""}</span>
            <span className="ovTrack"><span className="ovFill" style={{ width: `${(r.value / max) * 100}%` }} /></span>
          </>
        );
        return (
          <li key={r.key}>
            {onRow ? <button type="button" className="ovListRow" onClick={() => onRow(r.key)}>{inner}</button> : <div className="ovListRow">{inner}</div>}
          </li>
        );
      })}
    </ul>
  );
}

const APPLICATION_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted", UNDER_REVIEW: "Under review", HIRE_REQUESTED: "Hire requested", HIRED: "Hired", NOT_SELECTED: "Not selected", WITHDRAWN: "Withdrawn",
};
const HIRE_LABELS: Record<string, string> = { SUBMITTED: "Submitted", IN_COORDINATION: "In coordination", COMPLETED: "Completed", CANCELLED: "Cancelled" };

export function OverviewPage() {
  const { navigate } = useRouter();
  const [days, setDays] = useState<number>(30);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = (range: number) => {
    setLoading(true);
    setError(null);
    getAdminOverview(range)
      .then((o) => setOverview(o))
      .catch((e) => setError(e.message || "Failed to load the overview."))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(days); }, [days]);

  if (error && !overview) {
    return (
      <div className="reviewQueuePage">
        <ErrorState message={error} onRetry={() => load(days)} />
      </div>
    );
  }
  if (!overview) {
    return (
      <div className="reviewQueuePage">
        <LoadingState text="Loading the platform overview..." />
      </div>
    );
  }

  const o = overview;
  const t = o.trends;
  const pendingAccounts = o.accounts.pendingDoctors + o.accounts.pendingFacilities;
  const needs: ActionTile[] = [
    { label: "Accounts to review", value: pendingAccounts, hint: `${o.accounts.pendingDoctors} doctor${o.accounts.pendingDoctors === 1 ? "" : "s"}, ${o.accounts.pendingFacilities} facilit${o.accounts.pendingFacilities === 1 ? "y" : "ies"}`, to: "/accounts?status=PENDING_REVIEW" },
    { label: "Jobs to approve", value: o.jobs.pendingReview, hint: "Approve to publish, or ask for changes", to: "/jobs?status=PENDING_REVIEW" },
    { label: "Identity releases to decide", value: o.hireRequests.releasesAwaitingDecision, hint: "The doctor agreed — approve or decline", to: "/hire-requests?attention=decision" },
    { label: "Placements to complete", value: o.hireRequests.placementsReadyToComplete, hint: "Doctor and facility are connected", to: "/hire-requests?attention=complete" },
    { label: "Doctor profile edits", value: o.profileChanges.doctorPending, hint: "Compare, then approve or decline", to: "/doctor-changes?status=PENDING" },
    { label: "Facility profile changes", value: o.profileChanges.facilityPending, hint: "Compare, then approve or reject", to: "/facility-changes?status=PENDING" },
    { label: "New contact messages", value: o.contact.new, hint: `${o.contact.inReview} already in review`, to: "/contact-submissions?status=NEW" },
  ];
  const open = needs.filter((n) => n.value > 0).length;
  const funnel = t.funnel;
  const funnelRows = [
    { key: "applied", label: "Applications received", value: funnel.applied },
    { key: "hireRequested", label: "A facility asked to hire", value: funnel.hireRequested },
    { key: "consentGranted", label: "Doctor agreed to share their identity", value: funnel.consentGranted },
    { key: "identityReleased", label: "Identity released by you", value: funnel.identityReleased },
    { key: "hired", label: "Hired", value: funnel.hired },
  ];
  const appRows = Object.entries(o.applications.byStatus).filter(([, n]) => n > 0).map(([k, n]) => ({ key: k, label: APPLICATION_LABELS[k] ?? k, value: n }));
  const hireRows = Object.entries(o.hireRequests.byStatus).filter(([, n]) => n > 0).map(([k, n]) => ({ key: k, label: HIRE_LABELS[k] ?? k, value: n }));
  const totalApps = appRows.reduce((s, r) => s + r.value, 0);
  const rangeLabel = `${formatDate(t.since)} to today`;

  return (
    <div className="reviewQueuePage">
      <div className="pageHeaderSection pageHeaderWithActions">
        <div>
          <h1 className="pageHeaderTitle">Platform overview</h1>
          <p className="pageHeaderSubtitle">What needs your attention now, and how hiring is going. Every figure is counted from the platform database.</p>
        </div>
        <div className="ovRange" role="group" aria-label="Time range for the trends below">
          {RANGES.map((r) => <button key={r} type="button" aria-pressed={days === r} onClick={() => setDays(r)}>Last {r} days</button>)}
        </div>
      </div>
      {error && <ErrorState message={error} onRetry={() => load(days)} />}

      <section className="ovSection" style={{ marginTop: 8 }} aria-labelledby="ovAttention">
        <div className="ovSectionHead">
          <h2 className="ovSectionTitle" id="ovAttention">Needs your attention</h2>
          <p className="ovSectionHint">Each card opens the matching list, already filtered.</p>
        </div>
        {open === 0 && <div className="ovAllClear" role="status">All caught up: nothing is waiting for a decision.</div>}
        <div className="ovAttention">
          {needs.map((n) => (
            <button key={n.label} type="button" className={`ovAction ${n.value > 0 ? "ovActionNeeds" : ""}`} onClick={() => navigate(n.to)}>
              <span className="ovActionValue">{n.value}</span>
              <span className="ovActionLabel">{n.label}</span>
              <span className="ovActionHint">{n.value > 0 ? n.hint : "Nothing waiting"}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="ovSection" aria-labelledby="ovHiring">
        <div className="ovSectionHead">
          <h2 className="ovSectionTitle" id="ovHiring">Hiring, {rangeLabel}</h2>
          <p className="ovSectionHint">Based on applications submitted in this period.</p>
        </div>
        <div className="ovPanels">
          <div className="ovPanel">
            <h3 className="ovPanelTitle">Applications received per day</h3>
            <p className="ovPanelNote">{funnel.applied} in total. Each bar is one day.</p>
            {funnel.applied === 0 ? <p className="emptyStateSubtitle">No applications were received in this period.</p> : <DailyBars days={t.applicationsPerDay} />}
          </div>
          <div className="ovPanel">
            <h3 className="ovPanelTitle">Hiring funnel</h3>
            <p className="ovPanelNote">How far the applications received in this period have progressed so far. Percentages are of applications received.</p>
            {funnel.applied === 0 ? <p className="emptyStateSubtitle">No applications to follow in this period.</p> : <BarList rows={funnelRows} total={funnel.applied} />}
          </div>
          <div className="ovPanel">
            <h3 className="ovPanelTitle">Placements completed</h3>
            <p className="ovPanelNote">Placements you marked as completed in this period.</p>
            <div className="ovBigNumber">{t.placementsCompleted}</div>
            {t.placementsPerWeek.length > 0 && (
              <ul className="ovList" style={{ marginTop: 12 }}>
                {t.placementsPerWeek.map((w) => (
                  <li key={w.weekStarting} className="ovListRow"><span className="ovListLabel">Week of {formatDate(w.weekStarting)}</span><span className="ovListValue">{w.count}</span></li>
                ))}
              </ul>
            )}
          </div>
          <div className="ovPanel">
            <h3 className="ovPanelTitle">Applications by specialty</h3>
            <p className="ovPanelNote">Top specialties among applications received in this period.</p>
            {t.applicationsBySpecialty.length === 0 ? <p className="emptyStateSubtitle">No applications in this period.</p> : <BarList rows={t.applicationsBySpecialty.map((s) => ({ key: s.name, label: s.name, value: s.count }))} />}
          </div>
        </div>
      </section>

      <section className="ovSection" aria-labelledby="ovPipeline">
        <div className="ovSectionHead">
          <h2 className="ovSectionTitle" id="ovPipeline">Where things stand today</h2>
          <p className="ovSectionHint">Current totals, not limited to the period above.</p>
        </div>
        <div className="ovPanels">
          <div className="ovPanel">
            <h3 className="ovPanelTitle">Applications by status</h3>
            <p className="ovPanelNote">{totalApps} in total, {o.applications.withoutHireRequest} without a hire request yet.</p>
            {appRows.length === 0 ? <p className="emptyStateSubtitle">No applications yet.</p> : <BarList rows={appRows} onRow={(k) => navigate(`/applications?status=${k}`)} />}
          </div>
          <div className="ovPanel">
            <h3 className="ovPanelTitle">Hire requests by status</h3>
            <p className="ovPanelNote">{o.hireRequests.releasesAwaitingConsent} waiting for a doctor to respond.</p>
            {hireRows.length === 0 ? <p className="emptyStateSubtitle">No hire requests yet.</p> : <BarList rows={hireRows} onRow={(k) => navigate(`/hire-requests?status=${k}`)} />}
          </div>
          <div className="ovPanel">
            <h3 className="ovPanelTitle">Published jobs by country</h3>
            <p className="ovPanelNote">{o.jobs.published} published job{o.jobs.published === 1 ? "" : "s"} in total.</p>
            {t.publishedJobsByCountry.length === 0 ? <p className="emptyStateSubtitle">No jobs are published.</p> : <BarList rows={t.publishedJobsByCountry.map((c) => ({ key: c.name, label: c.name, value: c.count }))} />}
          </div>
          <div className="ovPanel">
            <h3 className="ovPanelTitle">Platform</h3>
            <p className="ovPanelNote">Approved accounts and the public Hospitals directory.</p>
            <BarList
              rows={[
                { key: "doctors", label: "Approved doctors", value: o.accounts.approvedDoctors },
                { key: "facilities", label: "Approved facilities", value: o.accounts.approvedFacilities },
                { key: "listed", label: "Facilities in the Hospitals directory", value: o.directory.listed },
                { key: "unlisted", label: "Approved facilities not listed", value: o.directory.approvedUnlisted },
              ]}
              onRow={(k) => navigate(k === "doctors" ? "/accounts?role=DOCTOR&status=APPROVED" : k === "facilities" ? "/accounts?role=FACILITY&status=APPROVED" : "/directory")}
            />
          </div>
        </div>
      </section>

      <p className="ovFooterLink">
        Looking for what changed? Every decision is recorded in the <button type="button" className="ovLink" onClick={() => navigate("/audit")}>activity history</button>.
      </p>
      {loading && <span className="sr-only" role="status">Updating</span>}
    </div>
  );
}
