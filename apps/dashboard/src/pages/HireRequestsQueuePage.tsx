import { useEffect, useState } from "react";
import type { AdminHireRequestsResponse } from "../types";
import { getAdminHireRequests } from "../api";
import { useRouter } from "../router";
import { EmptyState, ErrorState, LoadingState, PageHeader, Pagination, StatusBadge } from "../components/ui";
import { CONSENT_STATUS, ITEM_STATUS, RELEASE_STATUS, REQUEST_STATUS, formatDate, nextAction, orDash } from "../lib/format";

const STATUS_TABS: Array<[string, string]> = [["ALL", "All"], ["SUBMITTED", "Submitted"], ["IN_COORDINATION", "In coordination"], ["COMPLETED", "Completed"], ["CANCELLED", "Cancelled"]];
const ATTENTION: Array<[string, string]> = [["", "Everything"], ["decision", "Needs your decision"], ["consent", "Waiting for a doctor"], ["complete", "Ready to complete"]];

export function HireRequestsQueuePage() {
  const { navigate, search } = useRouter();
  const params = new URLSearchParams(search);
  const status = params.get("status") || "ALL";
  const attention = params.get("attention") || "";
  const term = params.get("search") || "";
  const page = parseInt(params.get("page") || "1", 10) || 1;
  const [q, setQ] = useState(term);
  const [data, setData] = useState<AdminHireRequestsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(null);
    getAdminHireRequests({ status, attention, search: term, page, limit: 10 })
      .then(setData)
      .catch((e) => setError(e.message || "Failed to load hire requests."))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [search]);
  useEffect(() => { setQ(term); }, [term]);

  const go = (next: { status?: string; attention?: string; search?: string; page?: number }) => {
    const n = new URLSearchParams();
    const s = next.status ?? status, a = next.attention ?? attention, t = next.search ?? term, p = next.page ?? 1;
    if (s !== "ALL") n.set("status", s);
    if (a) n.set("attention", a);
    if (t) n.set("search", t);
    if (p > 1) n.set("page", String(p));
    navigate(`/hire-requests${n.toString() ? `?${n}` : ""}`);
  };

  const meta = data?.meta;
  const counts = meta?.counts;
  const summary: Array<{ label: string; value: number | undefined; hint: string; attention?: string; status?: string }> = [
    { label: "Needs your decision", value: meta?.pendingReleaseCount, hint: "Doctor agreed — approve or decline the release", attention: "decision" },
    { label: "Ready to complete", value: meta?.placementsReadyCount, hint: "Doctor and facility are connected", attention: "complete" },
    { label: "Waiting for a doctor", value: meta?.pendingConsentCount, hint: "No action from you yet", attention: "consent" },
    { label: "In coordination", value: counts?.inCoordination, hint: "Requests being coordinated", status: "IN_COORDINATION" },
    { label: "Completed", value: counts?.completed, hint: "Placements finished", status: "COMPLETED" },
  ];

  return (
    <div className="reviewQueuePage">
      <PageHeader title="Hire requests" subtitle="Requests from hospitals to hire doctors who applied through the platform. Open a request to see its applicants, who needs to act next, and the history." />

      <div className="hrSummary">
        {summary.map((s) => (
          <button key={s.label} type="button" className={`ovAction ${s.attention && (s.value ?? 0) > 0 && s.attention !== "consent" ? "ovActionNeeds" : ""}`} onClick={() => go({ attention: s.attention ?? "", status: s.status ?? "ALL" })}>
            <span className="ovActionValue">{s.value ?? "—"}</span>
            <span className="ovActionLabel">{s.label}</span>
            <span className="ovActionHint">{s.hint}</span>
          </button>
        ))}
      </div>

      <div className="queueFiltersCard">
        <div className="filterTabsRow" role="tablist" aria-label="Request status">
          {STATUS_TABS.map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={status === k} className={`filterTabBtn ${status === k ? "filterTabActive" : ""}`} onClick={() => go({ status: k })}>
              <span>{l}</span>
              {k !== "ALL" && counts && <span className="tabCounterPill">{k === "SUBMITTED" ? counts.submitted : k === "IN_COORDINATION" ? counts.inCoordination : k === "COMPLETED" ? counts.completed : counts.cancelled}</span>}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
            Show
            <select className="cmsInput" style={{ minWidth: 190 }} value={attention} onChange={(e) => go({ attention: e.target.value })}>
              {ATTENTION.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          <form className="queueSearchForm" role="search" style={{ flex: "1 1 260px" }} onSubmit={(e) => { e.preventDefault(); go({ search: q.trim() }); }}>
            <div className="searchFieldWrap"><input className="queueSearchInput" style={{ paddingLeft: 14 }} aria-label="Search hire requests" placeholder="Search hospital, job or candidate code..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <button type="submit" className="queueSearchBtn">Search</button>
          </form>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {loading && !data ? (
        <LoadingState text="Loading hire requests..." />
      ) : data && data.hireRequests.length === 0 ? (
        <div className="queueTableCard"><EmptyState title="No hire requests found" text="Nothing matches these filters. Try another filter or clear the search." /></div>
      ) : data ? (
        <div className="hrList" aria-busy={loading || undefined}>
          {data.hireRequests.map((hr) => {
            const st = REQUEST_STATUS[hr.status] ?? { label: hr.status, tone: "neutral" as const };
            return (
              <article key={hr.id} className="hrCard">
                <header className="hrCardHead">
                  <div style={{ minWidth: 0 }}>
                    <h2 className="hrTitle">{hr.job.title}</h2>
                    <div className="hrMeta">
                      <span>{hr.job.ref}</span>
                      <span>{hr.facility.name}{hr.facility.location ? `, ${hr.facility.location}` : ""}</span>
                      <span>Submitted {formatDate(hr.submittedAt)}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                    <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                    <button type="button" className="btnReviewAction" onClick={() => navigate(`/hire-requests/${hr.id}`)}>Open request</button>
                  </div>
                </header>
                <div className="hrApplicants">
                  {hr.items.length === 0 && <div className="hrApplicant"><span className="hrNext">No applicants on this request.</span></div>}
                  {hr.items.map((it) => {
                    const next = nextAction(it);
                    const consent = CONSENT_STATUS[it.identityRelease?.doctorConsentStatus ?? "PENDING"];
                    const release = RELEASE_STATUS[it.identityRelease?.status ?? "PENDING"];
                    const item = ITEM_STATUS[it.status] ?? { label: it.status, tone: "neutral" as const };
                    return (
                      <div key={it.id} className="hrApplicant">
                        <div>
                          <div className="hrCode">{it.candidateCode}</div>
                          <div className="hrNext">{orDash(it.specialty)} · {it.yearsOfExperience ?? "—"} yrs</div>
                        </div>
                        <div>
                          <div className="hrBadges">
                            <StatusBadge tone={item.tone}>{item.label}</StatusBadge>
                            <StatusBadge tone={consent.tone}>{consent.label}</StatusBadge>
                            <StatusBadge tone={release.tone}>{release.label}</StatusBadge>
                          </div>
                          <div className={`hrNext ${next.kind === "decide" || next.kind === "complete" ? "hrNextNeeds" : ""}`} style={{ marginTop: 6 }}>{next.text}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
          <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={(p) => go({ page: p })} />
        </div>
      ) : null}
    </div>
  );
}
