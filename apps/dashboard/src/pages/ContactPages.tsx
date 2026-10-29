import { useEffect, useState } from "react";
import type { ContactSubmissionDetail, ContactSubmissionsResponse } from "../types";
import { getContactSubmission, getContactSubmissions, updateContactSubmissionStatus } from "../api";
import { useRouter } from "../router";
import { ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeader, Pagination, StatusBadge } from "../components/ui";
import { CONTACT_STATUS, formatDate, formatDateTime, orDash } from "../lib/format";

const TABS: Array<[string, string]> = [["ALL", "All"], ["NEW", "New"], ["IN_REVIEW", "In review"], ["RESOLVED", "Resolved"], ["SPAM", "Spam"]];
const badge = (s: string) => CONTACT_STATUS[s] ?? { label: s, tone: "neutral" as const };

// ---------------------------------------------------------------------------
// List: scan, search and filter. The full message is read on its own page.
// ---------------------------------------------------------------------------
export function ContactSubmissionsPage() {
  const { navigate, search } = useRouter();
  const params = new URLSearchParams(search);
  const status = params.get("status") || "ALL";
  const term = params.get("search") || "";
  const page = parseInt(params.get("page") || "1", 10) || 1;
  const [q, setQ] = useState(term);
  const [data, setData] = useState<ContactSubmissionsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(null);
    getContactSubmissions({ status, search: term, page })
      .then(setData)
      .catch((e) => setError(e.message || "Failed to load contact messages."))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [search]);
  useEffect(() => { setQ(term); }, [term]);

  const go = (next: { status?: string; search?: string; page?: number }) => {
    const n = new URLSearchParams();
    const s = next.status ?? status, t = next.search ?? term, p = next.page ?? 1;
    if (s !== "ALL") n.set("status", s);
    if (t) n.set("search", t);
    if (p > 1) n.set("page", String(p));
    navigate(`/contact-submissions${n.toString() ? `?${n}` : ""}`);
  };

  return (
    <div className="reviewQueuePage">
      <PageHeader title="Contact messages" subtitle="Messages sent through the public Contact page. Open a message to read it in full and move it through review." />
      <div className="queueFiltersCard">
        <div className="filterTabsRow" role="tablist" aria-label="Message status">
          {TABS.map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={status === k} className={`filterTabBtn ${status === k ? "filterTabActive" : ""}`} onClick={() => go({ status: k })}>
              <span>{l}</span><span className="tabCounterPill">{data?.meta.counts[k] ?? 0}</span>
            </button>
          ))}
        </div>
        <form className="queueSearchForm" role="search" onSubmit={(e) => { e.preventDefault(); go({ search: q.trim() }); }}>
          <div className="searchFieldWrap"><input className="queueSearchInput" style={{ paddingLeft: 14 }} aria-label="Search messages" placeholder="Search name, email or message..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <button type="submit" className="queueSearchBtn">Search</button>
        </form>
      </div>
      {error && <ErrorState message={error} onRetry={load} />}
      <div className="queueTableCard">
        {loading && !data ? <LoadingState text="Loading messages..." /> : data && data.items.length === 0 ? (
          <EmptyState title="No messages found" text={term || status !== "ALL" ? "Nothing matches these filters. Try another status or clear the search." : "Messages sent through the Contact page will appear here."} />
        ) : data ? (
          <div className="tableResponsiveWrap" aria-busy={loading || undefined}>
            <table className="queueTable">
              <thead><tr><th>From</th><th>Message</th><th>Received</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data.items.map((s) => (
                  <tr key={s.id}>
                    <td><div className="facilityNameCell"><strong>{s.fullName}</strong><span style={{ fontSize: 12.5 }}>{s.email}</span></div></td>
                    <td><strong style={{ display: "block" }}>{s.subject ?? "No subject"}</strong><span className="ctPreview">{s.message}</span></td>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDate(s.createdAt)}</td>
                    <td><StatusBadge tone={badge(s.status).tone}>{badge(s.status).label}</StatusBadge></td>
                    <td><div className="rowActions"><button type="button" className="btnReviewAction" onClick={() => navigate(`/contact-submissions/${s.id}`)}>Read message</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {data && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={(p) => go({ page: p })} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail: the complete message, who reviewed it, the internal note and the valid next steps
// ---------------------------------------------------------------------------
const ACTIONS: Record<string, { label: string; title: string; text: string; danger: boolean; needsConfirm: boolean; done: string }> = {
  IN_REVIEW: { label: "Start review", title: "Start reviewing this message?", text: "It moves to In review so your team can see someone is handling it.", danger: false, needsConfirm: false, done: "Message moved to in review." },
  RESOLVED: { label: "Mark as resolved", title: "Mark this message as resolved?", text: "Resolved is final: the message cannot be moved again.", danger: false, needsConfirm: true, done: "Message marked as resolved." },
  SPAM: { label: "Mark as spam", title: "Mark this message as spam?", text: "Spam is final: the message cannot be moved again. It is kept, not deleted.", danger: true, needsConfirm: true, done: "Message marked as spam." },
};

export function ContactDetailPage({ submissionId, onActionComplete }: { submissionId: string; onActionComplete?: (m: string) => void }) {
  const { navigate } = useRouter();
  const [s, setS] = useState<ContactSubmissionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = () =>
    getContactSubmission(submissionId)
      .then((d) => { setS(d); setNote(d.internalNote ?? ""); setError(null); })
      .catch((e) => setError(e.message || "Failed to load this message."));
  useEffect(() => { setS(null); load(); }, [submissionId]);

  const move = async (to: string) => {
    setBusy(true);
    setActionError(null);
    try {
      await updateContactSubmissionStatus(submissionId, to, note.trim() || undefined);
      onActionComplete?.(ACTIONS[to].done);
      setConfirming(null);
      await load();
    } catch (e: any) {
      setActionError(e.message || "That change could not be saved.");
    } finally {
      setBusy(false);
    }
  };
  const choose = (to: string) => (ACTIONS[to].needsConfirm ? (setActionError(null), setConfirming(to)) : move(to));

  if (error && !s) return (
    <div className="detailPageWrapper">
      <ErrorState message={error} onRetry={load} />
      <button type="button" className="secondaryButton" onClick={() => navigate("/contact-submissions")}>Back to contact messages</button>
    </div>
  );
  if (!s) return <div className="detailPageWrapper"><LoadingState text="Loading message..." /></div>;
  const st = badge(s.status);
  const final = s.nextStatuses.length === 0;

  return (
    <div className="detailPageWrapper">
      <div className="detailTopNav"><button type="button" className="backToQueueLink" onClick={() => navigate("/contact-submissions")}>← Back to contact messages</button></div>
      <div className="pageHeaderSection pageHeaderWithActions">
        <div>
          <h1 className="pageHeaderTitle">{s.subject ?? "Message without a subject"}</h1>
          <p className="pageHeaderSubtitle">From {s.fullName} · received {formatDateTime(s.createdAt)}</p>
        </div>
        <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
      </div>
      {error && <ErrorState message={error} onRetry={load} />}

      <div className="hrDetailGrid">
        <section className="ovPanel">
          <h2 className="ovPanelTitle">Sender</h2>
          <dl className="hrFacts" style={{ marginTop: 12 }}>
            <dt>Name</dt><dd>{s.fullName}</dd>
            <dt>Email</dt><dd>{s.email}</dd>
            <dt>Phone</dt><dd>{orDash(s.phone)}</dd>
            <dt>Language</dt><dd>{s.language === "AR" ? "Arabic" : s.language === "EN" ? "English" : "—"}</dd>
            <dt>Account</dt><dd>{s.submittedBy ? `Signed-in ${s.submittedBy.role.toLowerCase()}` : "Visitor without an account"}</dd>
          </dl>
        </section>
        <section className="ovPanel">
          <h2 className="ovPanelTitle">Review</h2>
          <dl className="hrFacts" style={{ marginTop: 12 }}>
            <dt>Status</dt><dd>{st.label}</dd>
            <dt>Reviewed by</dt><dd>{orDash(s.reviewedBy)}</dd>
            <dt>Reviewed on</dt><dd>{formatDateTime(s.reviewedAt)}</dd>
          </dl>
          <p className="ovPanelNote" style={{ marginTop: 12 }}>Email delivery is not set up on the platform, so nothing is sent from here. Use the sender's email address to reply from your own mailbox.</p>
        </section>
      </div>

      <section className="ovPanel" style={{ marginBottom: 16 }}>
        <h2 className="ovPanelTitle">Message</h2>
        <div className="ctBody" style={{ marginTop: 10 }}>{s.message}</div>
      </section>

      <section className="ovPanel" style={{ marginBottom: 16 }}>
        <h2 className="ovPanelTitle">Internal note</h2>
        {final ? (
          <p className="hrNext" style={{ marginTop: 8 }}>{s.internalNote ? s.internalNote : "No note was added."}</p>
        ) : (
          <>
            <p className="ovPanelNote">Only your team sees this. It is saved when you move the message to its next status.</p>
            <textarea className="rejectionTextarea" rows={3} aria-label="Internal note" value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} disabled={busy} />
          </>
        )}
        {!final && (
          <div className="rowActions" style={{ justifyContent: "flex-start", marginTop: 14 }}>
            {s.nextStatuses.map((to) => ACTIONS[to] && (
              <button key={to} type="button" className={to === "SPAM" ? "btnRejectAction" : to === "RESOLVED" ? "btnApproveAction" : "secondaryButton"} disabled={busy} onClick={() => choose(to)} aria-busy={busy && confirming === null || undefined}>{ACTIONS[to].label}</button>
            ))}
          </div>
        )}
        {final && <p className="ovPanelNote" style={{ marginTop: 12 }}>This message is {st.label.toLowerCase()} and cannot be changed. It is kept for the record.</p>}
        {actionError && !confirming && <div className="actionErrorBanner" role="alert" style={{ marginTop: 12 }}>{actionError}</div>}
      </section>

      <section className="ovPanel">
        <h2 className="ovPanelTitle">History</h2>
        <ul className="hrTimeline" style={{ marginTop: 12 }}>
          <li><strong>Message received</strong><div className="hrNext">{formatDateTime(s.createdAt)}</div></li>
          {s.history.map((h, i) => (
            <li key={i}>
              <strong>{h.from && h.to ? `${badge(h.from).label} → ${badge(h.to).label}` : "Status changed"}</strong>
              <div className="hrNext">{formatDateTime(h.at)} · {h.actor}</div>
              {h.note && <div className="hrNext">“{h.note}”</div>}
            </li>
          ))}
        </ul>
      </section>

      {confirming && (
        <ConfirmDialog
          title={ACTIONS[confirming].title}
          message={ACTIONS[confirming].text}
          confirmLabel={ACTIONS[confirming].label}
          danger={ACTIONS[confirming].danger}
          busy={busy}
          error={actionError}
          onConfirm={() => move(confirming)}
          onCancel={() => !busy && setConfirming(null)}
        />
      )}
    </div>
  );
}
