import { useEffect, useState } from "react";
import type { DeletionAction, DeletionRequestDetail, DeletionRequestsResponse } from "../types";
import { decideDeletionRequest, getDeletionRequest, getDeletionRequests } from "../api";
import { useRouter } from "../router";

const humanize = (v: string) => v.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const fmt = (d: string) => new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const pill = (s: string) => (s === "REQUESTED" ? "badgePending" : s === "IN_REVIEW" ? "badgeWarning" : s === "COMPLETED" ? "badgeApproved" : "badgeDraft");
const ACTION_LABEL: Record<DeletionAction, string> = { review: "Start review", reject: "Decline request", complete: "Complete and deactivate" };
const TABS = ["ALL", "REQUESTED", "IN_REVIEW", "COMPLETED", "REJECTED", "CANCELLED"];

export function DeletionRequestsPage() {
  const { navigate, search } = useRouter();
  const params = new URLSearchParams(search);
  const status = params.get("status") || "ALL";
  const page = parseInt(params.get("page") || "1", 10);
  const [q, setQ] = useState(params.get("search") || "");
  const [data, setData] = useState<DeletionRequestsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    getDeletionRequests({ status, search: params.get("search") || "", page }).then(setData).catch((e) => setError(e.message));
  }, [search]);

  const go = (s: string, p = 1, term = params.get("search") || "") => {
    const n = new URLSearchParams();
    if (s !== "ALL") n.set("status", s);
    if (term) n.set("search", term);
    if (p > 1) n.set("page", String(p));
    navigate(`/deletion-requests${n.toString() ? `?${n}` : ""}`);
  };

  return (
    <div className="reviewQueuePage">
      <div className="pageHeaderSection">
        <div>
          <h1 className="pageHeaderTitle">Deletion requests</h1>
          <p className="pageHeaderSubtitle">Doctors and hospitals who asked to close their account. Completing a request deactivates the account; no records are deleted.</p>
        </div>
      </div>
      <div className="queueFiltersCard">
        <div className="filterTabsRow" role="tablist">
          {TABS.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={status === t} className={`filterTabBtn ${status === t ? "filterTabActive" : ""}`} onClick={() => go(t)}>
              <span>{t === "ALL" ? "All" : humanize(t)}</span>
              <span className="tabCounterPill">{data?.meta.counts[t] ?? 0}</span>
            </button>
          ))}
        </div>
        <form className="queueSearchForm" role="search" onSubmit={(e) => { e.preventDefault(); go(status, 1, q.trim()); }}>
          <div className="searchFieldWrap">
            <input className="queueSearchInput" style={{ paddingLeft: 14 }} placeholder="Search name or email..." aria-label="Search deletion requests" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button type="submit" className="queueSearchBtn">Search</button>
        </form>
      </div>
      {error && <div className="actionErrorBanner" role="alert">{error}</div>}
      <div className="queueTableCard">
        {!data && !error ? (
          <div className="tableLoadingState"><div className="tableSpinner" /><p>Loading deletion requests...</p></div>
        ) : data && data.items.length === 0 ? (
          <div className="tableEmptyState"><h3 className="emptyStateTitle">No deletion requests</h3><p className="emptyStateSubtitle">No requests match the current filters.</p></div>
        ) : data ? (
          <div className="tableResponsiveWrap">
            <table className="queueTable">
              <thead><tr><th>Account</th><th>Requested</th><th>Status</th><th /></tr></thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="facilityNameCell">
                        <strong>{r.account.name}</strong>
                        <span style={{ fontSize: 12 }}>{humanize(r.account.role)} · {r.account.email ?? "no email"}</span>
                        <span className="subRefId">Account is {humanize(r.account.status)}</span>
                      </div>
                    </td>
                    <td>{fmt(r.requestedAt)}</td>
                    <td><span className={`statusPill ${pill(r.status)}`}>{humanize(r.status)}</span></td>
                    <td><button type="button" className="btnReviewAction" onClick={() => navigate(`/deletion-requests/${r.id}`)}>{r.nextActions.length ? "Review" : "View"}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {data && data.meta.totalPages > 1 && (
          <div className="tablePaginationFooter">
            <span>Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total})</span>
            <div className="paginationBtnGroup">
              <button type="button" className="paginationBtn" disabled={page <= 1} onClick={() => go(status, page - 1)}>Previous</button>
              <button type="button" className="paginationBtn" disabled={page >= data.meta.totalPages} onClick={() => go(status, page + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function DeletionRequestDetailPage({ requestId, onActionComplete }: { requestId: string; onActionComplete?: (m: string) => void }) {
  const { navigate } = useRouter();
  const [req, setReq] = useState<DeletionRequestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DeletionAction | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = () => getDeletionRequest(requestId).then(setReq).catch((e) => setError(e.message));
  useEffect(() => { setReq(null); setError(null); load(); }, [requestId]);

  const run = async (action: DeletionAction) => {
    if (action === "reject" && text.trim().length < 3) { setActionError("A reason of at least 3 characters is required to decline the request."); return; }
    setBusy(true); setActionError(null);
    try {
      await decideDeletionRequest(requestId, action, text.trim() || undefined);
      setDialog(null); setText("");
      onActionComplete?.(action === "complete" ? "Request completed. The account is now deactivated." : action === "reject" ? "Request declined." : "Review started.");
      await load();
    } catch (e: any) { setActionError(e.message); } finally { setBusy(false); }
  };

  if (error) return (<div className="detailPageWrapper"><div className="actionErrorBanner" role="alert">{error}</div><button type="button" className="secondaryButton" onClick={() => navigate("/deletion-requests")}>Back to requests</button></div>);
  if (!req) return (<div className="detailPageWrapper"><div className="tableLoadingState"><div className="tableSpinner" /><p>Loading request...</p></div></div>);

  const done = req.nextActions.length === 0;
  const row = (k: string, v: React.ReactNode) => (<div style={{ display: "flex", gap: 12, padding: "6px 0", flexWrap: "wrap" }}><strong style={{ minWidth: 150 }}>{k}</strong><span>{v}</span></div>);
  return (
    <div className="detailPageWrapper">
      <div className="detailTopNav"><button type="button" className="backToQueueLink" onClick={() => navigate("/deletion-requests")}>← Back to deletion requests</button></div>
      <section className="detailHeaderCard" style={{ padding: 20, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 className="pageHeaderTitle" style={{ marginBottom: 6 }}>{req.account.name}</h1>
          <span className={`statusPill ${pill(req.status)}`}>{humanize(req.status)}</span>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
          {req.nextActions.map((a) => (
            <button key={a} type="button" className={a === "reject" ? "btnRejectAction" : a === "complete" ? "btnApproveAction" : "btnReviewAction"} onClick={() => { setActionError(null); setText(""); a === "review" ? run("review") : setDialog(a); }} disabled={busy}>
              {ACTION_LABEL[a]}
            </button>
          ))}
          {done && <span style={{ color: "#64748b" }}>{req.status === "COMPLETED" ? "Completed — no further actions." : "No further actions."}</span>}
        </div>
      </section>
      {actionError && !dialog && <div className="actionErrorBanner" role="alert">{actionError}</div>}

      <section className="queueTableCard" style={{ padding: 20, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Request</h3>
        {row("Requested", fmt(req.requestedAt))}
        {row("Reason given", req.reason ?? "No reason given")}
        {req.processedAt && row("Processed", `${fmt(req.processedAt)}${req.processedBy ? ` by ${req.processedBy}` : ""}`)}
        {req.resolutionNote && row("Resolution note", req.resolutionNote)}
      </section>

      <section className="queueTableCard" style={{ padding: 20, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Account</h3>
        {row("Type", humanize(req.account.role))}
        {row("Account status", humanize(req.account.status))}
        {row("Email", req.account.email ?? "—")}
        {row("Mobile", req.account.mobile ?? "—")}
        {row("Member since", fmt(req.account.createdAt))}
        {req.account.deactivatedAt && row("Deactivated", fmt(req.account.deactivatedAt))}
        <button type="button" className="secondaryButton" style={{ marginTop: 10 }} onClick={() => navigate(`/accounts/${req.account.id}`)}>Open account page</button>
      </section>

      <section className="queueTableCard" style={{ padding: 20, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Records that are kept</h3>
        <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: 14 }}>Completing a request only deactivates the account. Nothing below is deleted.</p>
        {row("Applications", req.preserved.applications)}
        {row("Hire request items", req.preserved.hireRequestItems)}
        {row("Chats", req.preserved.conversations)}
        {row("Messages sent", req.preserved.messages)}
        {row("Jobs", req.preserved.jobs)}
      </section>

      <section className="queueTableCard" style={{ padding: 20, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Decision history</h3>
        {req.history.length === 0 ? <p style={{ color: "#64748b" }}>No decisions yet.</p> : req.history.map((h, i) => (
          <div key={i} style={{ padding: "6px 0" }}><strong>{humanize(h.action.replace("ACCOUNT_DELETION_", ""))}</strong> · {h.actor} · {fmt(h.at)}{h.reason ? ` — "${h.reason}"` : ""}</div>
        ))}
      </section>

      {dialog && (
        <div className="modalBackdrop" role="dialog" aria-modal="true" aria-label={ACTION_LABEL[dialog]}>
          <div className="modalCard" style={{ maxWidth: 560 }}>
            <h3 className="modalTitle">{dialog === "complete" ? "Deactivate this account?" : "Decline this request?"}</h3>
            <p className="modalSubtitle" style={{ marginTop: 8 }}>
              {dialog === "complete"
                ? `${req.account.name} will be signed out everywhere and can no longer sign in. This is final: deactivated accounts cannot be reactivated. All records are kept.`
                : "The account stays active. The person is notified that the request was declined."}
            </p>
            {actionError && <div className="modalErrorMessage">{actionError}</div>}
            <div style={{ marginTop: 16 }}>
              <label htmlFor="del-text" style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>{dialog === "reject" ? "Reason *" : "Note (optional)"}</label>
              <textarea id="del-text" className="rejectionTextarea" rows={3} value={text} onChange={(e) => setText(e.target.value)} disabled={busy} />
            </div>
            <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" className="secondaryButton" onClick={() => setDialog(null)} disabled={busy}>Cancel</button>
              <button type="button" className="confirmRejectBtn" onClick={() => run(dialog)} disabled={busy}>{busy ? "Working..." : dialog === "complete" ? "Deactivate account" : "Decline request"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
