import { useEffect, useState } from "react";
import type { AuditLogsResponse, ContactSubmissionsResponse, FacilityListingRow, ReferenceDataResponse } from "../types";
import {
  getAuditLogs,
  getContactSubmissions,
  getFacilityListings,
  setFacilityPublicListing,
  updateContactSubmissionStatus,
} from "../api";
import { useRouter } from "../router";

const humanize = (v: string) => v.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const fmt = (d: string) => new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="pageHeaderSection">
      <div>
        <h1 className="pageHeaderTitle">{title}</h1>
        <p className="pageHeaderSubtitle">{subtitle}</p>
      </div>
    </div>
  );
}
const Loading = ({ text }: { text: string }) => (
  <div className="tableLoadingState">
    <div className="tableSpinner" />
    <p>{text}</p>
  </div>
);
const Empty = ({ title, text }: { title: string; text: string }) => (
  <div className="tableEmptyState">
    <h3 className="emptyStateTitle">{title}</h3>
    <p className="emptyStateSubtitle">{text}</p>
  </div>
);

// ---------------------------------------------------------------------------
// Public Hospitals directory listing controls
// ---------------------------------------------------------------------------
export function DirectoryPage({ onActionComplete }: { onActionComplete?: (m: string) => void }) {
  const { navigate, search } = useRouter();
  const filter = new URLSearchParams(search).get("filter") || "ALL";
  const [rows, setRows] = useState<FacilityListingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => getFacilityListings(filter).then(setRows).catch((e) => setError(e.message));
  useEffect(() => {
    setRows(null);
    setError(null);
    load();
  }, [filter]);

  const toggle = async (r: FacilityListingRow, enabled: boolean) => {
    setBusy(r.id);
    setError(null);
    try {
      const res = await setFacilityPublicListing(r.accountId, enabled);
      onActionComplete?.(res.message);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const tabs = [["ALL", "All facilities"], ["LISTED", "Listed"], ["APPROVED_UNLISTED", "Approved, not listed"], ["NOT_APPROVED", "Not approved"]];
  return (
    <div className="reviewQueuePage">
      <Header title="Hospitals directory" subtitle="Only approved facilities that an administrator has explicitly listed appear on the public Hospitals page. Job listings stay anonymous either way." />
      <div className="queueFiltersCard">
        <div className="filterTabsRow" role="tablist">
          {tabs.map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={filter === k} className={`filterTabBtn ${filter === k ? "filterTabActive" : ""}`} onClick={() => navigate(`/directory${k === "ALL" ? "" : `?filter=${k}`}`)}>
              <span>{l}</span>
            </button>
          ))}
        </div>
      </div>
      {error && <div className="actionErrorBanner" role="alert">{error}</div>}
      <div className="queueTableCard">
        {!rows ? <Loading text="Loading facilities..." /> : rows.length === 0 ? <Empty title="No facilities" text="No facilities match this filter." /> : (
          <div className="tableResponsiveWrap">
            <table className="queueTable">
              <thead><tr><th>Facility</th><th>Account</th><th>Directory</th><th>Last enabled</th><th>Next action</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td><div className="facilityNameCell"><strong>{r.name}</strong><span className="subRefId">{r.location ?? "No location"} · {r.jobsCount} jobs</span></div></td>
                    <td><span className={`statusPill ${r.accountStatus === "APPROVED" ? "badgeApproved" : "badgePending"}`}>{humanize(r.accountStatus)}</span></td>
                    <td><span className={`statusPill ${r.isPubliclyVisible ? "badgeApproved" : "badgeDraft"}`}>{r.isPubliclyVisible ? "Visible publicly" : "Hidden"}</span></td>
                    <td>{r.enabledAt ? `${fmt(r.enabledAt)}${r.enabledBy ? ` · ${r.enabledBy}` : ""}` : <span style={{ color: "#94a3b8" }}>Never enabled</span>}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {r.isListedPublicly ? (
                          <button type="button" className="btnReviewAction" disabled={busy === r.id} onClick={() => toggle(r, false)}>Remove from directory</button>
                        ) : r.accountStatus === "APPROVED" ? (
                          <button type="button" className="btnReviewAction" disabled={busy === r.id} onClick={() => toggle(r, true)}>List in directory</button>
                        ) : (
                          <button type="button" className="btnReviewAction" onClick={() => navigate(`/accounts/${r.accountId}`)}>Review account first</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contact submissions
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Audit history (append-only)
// ---------------------------------------------------------------------------
export function AuditPage() {
  const { navigate, search } = useRouter();
  const params = new URLSearchParams(search);
  const action = params.get("action") || "";
  const page = parseInt(params.get("page") || "1", 10);
  const [data, setData] = useState<AuditLogsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setData(null); getAuditLogs({ action, page }).then(setData).catch((e) => setError(e.message)); }, [search]);
  const go = (a: string, p = 1) => {
    const n = new URLSearchParams();
    if (a) n.set("action", a);
    if (p > 1) n.set("page", String(p));
    navigate(`/audit${n.toString() ? `?${n}` : ""}`);
  };
  return (
    <div className="reviewQueuePage">
      <Header title="Activity history" subtitle="Append-only record of administrator decisions, status changes, listing changes and reads of doctor identity data. Entries hold record references, never the sensitive values." />
      <div className="queueFiltersCard">
        <select className="queueSearchInput" style={{ paddingLeft: 12, maxWidth: 360 }} aria-label="Filter by action" value={action} onChange={(e) => go(e.target.value)}>
          <option value="">All actions</option>
          {data?.filters.actions.map((a) => <option key={a.value} value={a.value}>{a.value} ({a.count})</option>)}
        </select>
      </div>
      {error && <div className="actionErrorBanner" role="alert">{error}</div>}
      <div className="queueTableCard">
        {!data ? <Loading text="Loading audit history..." /> : data.items.length === 0 ? <Empty title="No audit entries" text="Nothing has been recorded for this filter." /> : (
          <div className="tableResponsiveWrap"><table className="queueTable"><thead><tr><th>When</th><th>Action</th><th>By</th><th>Record</th><th>References / note</th></tr></thead><tbody>
            {data.items.map((l) => (
              <tr key={l.id}>
                <td>{fmt(l.createdAt)}</td><td><strong>{l.action}</strong></td><td>{l.actor}{l.actorRole ? <div className="subRefId">{humanize(l.actorRole)}</div> : null}</td>
                <td><span className="subRefId" style={{ marginTop: 0 }}>{l.entityType} · {l.entityId === "batch" ? "multiple" : l.entityId.slice(0, 8)}</span></td>
                <td style={{ fontSize: 12, maxWidth: 360, wordBreak: "break-word" }}>{Object.entries(l.metadata).map(([k, v]) => `${k}: ${Array.isArray(v) ? `${v.length} ids` : String(v)}`).join(" · ") || "—"}</td>
              </tr>))}
          </tbody></table></div>)}
        {data && data.meta.totalPages > 1 && (
          <div className="tablePaginationFooter"><span>Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} entries)</span>
            <div className="paginationBtnGroup"><button type="button" className="paginationBtn" disabled={page <= 1} onClick={() => go(action, page - 1)}>Previous</button><button type="button" className="paginationBtn" disabled={page >= data.meta.totalPages} onClick={() => go(action, page + 1)}>Next</button></div></div>)}
      </div>
    </div>
  );
}
