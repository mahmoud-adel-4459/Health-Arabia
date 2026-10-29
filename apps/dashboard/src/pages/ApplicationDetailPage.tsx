import { useEffect, useState } from "react";
import type { AdminApplicationDetail } from "../types";
import { completePlacement, getAdminApplicationDetail } from "../api";
import { useRouter } from "../router";

const humanize = (v: string | null | undefined) => (v ? v.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : "—");
const fmt = (d: string | null) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");

export function ApplicationDetailPage({ applicationId, onActionComplete }: { applicationId: string; onActionComplete?: (m: string) => void }) {
  const { navigate } = useRouter();
  const [app, setApp] = useState<AdminApplicationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => getAdminApplicationDetail(applicationId).then(setApp).catch((e) => setError(e.message));
  useEffect(() => { setApp(null); load(); }, [applicationId]);

  const complete = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await completePlacement(applicationId, note.trim() || undefined);
      onActionComplete?.(r.message);
      setNote("");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !app) return <div className="reviewQueuePage"><div className="actionErrorBanner" role="alert">{error}</div></div>;
  if (!app) return <div className="reviewQueuePage"><div className="tableLoadingState"><div className="tableSpinner" /><p>Loading application...</p></div></div>;

  const latest = app.hireRequests[0];
  return (
    <div className="reviewQueuePage">
      <div className="pageHeaderSection">
        <div>
          <button type="button" className="btnBackToQueue" onClick={() => navigate("/applications")}>← Back to applications</button>
          <h1 className="pageHeaderTitle" style={{ marginTop: 12 }}>{app.job.title}</h1>
          <p className="pageHeaderSubtitle">{app.candidateCode} · {app.job.ref} · {app.facility.name}</p>
        </div>
      </div>

      <div className="noticeBanner pendingBanner"><strong>Next step:</strong> {app.nextAction}</div>
      {error && <div className="actionErrorBanner" role="alert">{error}</div>}

      <div className="contentCard">
        <div className="cardHeader"><h2 className="cardTitle">Doctor (platform only)</h2><span className="cardPill">{humanize(app.status)}</span></div>
        <div className="profileInfoGrid">
          <div className="profileField"><span className="fieldLabel">Name</span><span className="fieldValue highlightValue">{app.doctor.fullName}</span></div>
          <div className="profileField"><span className="fieldLabel">Mobile</span><span className="fieldValue">{app.doctor.mobileE164 ?? "—"}</span></div>
          <div className="profileField"><span className="fieldLabel">Email</span><span className="fieldValue">{app.doctor.email ?? "—"}</span></div>
          <div className="profileField"><span className="fieldLabel">Anonymous profile shown to facility</span><span className="fieldValue">{app.anonymous.jobTitle} · {app.anonymous.specialty} · {app.anonymous.yearsOfExperience} yrs</span></div>
        </div>
        <div style={{ marginTop: 12 }}><button type="button" className="btnReviewAction" onClick={() => navigate(`/accounts/${app.doctor.accountId}`)}>Open doctor account</button></div>
      </div>

      <div className="contentCard">
        <div className="cardHeader"><h2 className="cardTitle">Facility &amp; recruitment contact</h2><span className="cardPill">{humanize(app.facility.accountStatus)}</span></div>
        <div className="profileInfoGrid">
          <div className="profileField"><span className="fieldLabel">Facility</span><span className="fieldValue highlightValue">{app.facility.name}</span></div>
          <div className="profileField"><span className="fieldLabel">Recruitment officer</span><span className="fieldValue">{app.facility.recruitmentContact.name}</span></div>
          <div className="profileField"><span className="fieldLabel">Officer email (login)</span><span className="fieldValue">{app.facility.recruitmentContact.email ?? "—"}</span></div>
          <div className="profileField"><span className="fieldLabel">Officer phone</span><span className="fieldValue">{app.facility.recruitmentContact.phone ?? "—"}</span></div>
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button type="button" className="btnReviewAction" onClick={() => navigate(`/accounts/${app.facility.accountId}`)}>Open facility account</button>
          <button type="button" className="btnReviewAction" onClick={() => navigate(`/jobs/${app.job.id}`)}>Open job</button>
        </div>
      </div>

      <div className="contentCard">
        <div className="cardHeader"><h2 className="cardTitle">Hiring progress</h2></div>
        {!latest ? <p className="fieldDescription">The facility has not requested to hire this candidate yet.</p> : app.hireRequests.map((h) => (
          <div key={h.itemId} className="profileInfoGrid" style={{ marginBottom: 12 }}>
            <div className="profileField"><span className="fieldLabel">Hire request</span><span className="fieldValue">{humanize(h.requestStatus)} · {fmt(h.requestedAt)}</span></div>
            <div className="profileField"><span className="fieldLabel">Candidate in request</span><span className="fieldValue">{humanize(h.itemStatus)}</span></div>
            <div className="profileField"><span className="fieldLabel">Doctor consent</span><span className="fieldValue">{h.identityRelease ? `${humanize(h.identityRelease.doctorConsentStatus)} · ${fmt(h.identityRelease.doctorConsentAt)}` : "—"}</span></div>
            <div className="profileField"><span className="fieldLabel">Identity release</span><span className="fieldValue">{h.identityRelease ? `${humanize(h.identityRelease.status)}${h.identityRelease.decidedBy ? ` by ${h.identityRelease.decidedBy}` : ""}` : "—"}</span></div>
            <div className="profileField"><span className="fieldLabel">Group chat</span><span className="fieldValue">{h.identityRelease?.conversation ? `${humanize(h.identityRelease.conversation.status)} · ${h.identityRelease.conversation.messageCount} messages` : "Not created"}</span></div>
            {h.facilityNote && <div className="profileField"><span className="fieldLabel">Facility note</span><span className="fieldValue">{h.facilityNote}</span></div>}
          </div>
        ))}
        {(app.canCompletePlacement || latest) && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" className="btnReviewAction" onClick={() => navigate("/hire-requests")}>Open hire requests</button>
            {app.canCompletePlacement && (
              <>
                <input className="queueSearchInput" style={{ paddingLeft: 12, height: 38, maxWidth: 320 }} placeholder="Completion note (optional)" aria-label="Completion note" value={note} onChange={(e) => setNote(e.target.value)} />
                <button type="button" className="btnApproveAction" disabled={busy} onClick={complete}>{busy ? "Completing..." : "Mark placement completed"}</button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="contentCard">
        <div className="cardHeader"><h2 className="cardTitle">Status history</h2></div>
        {app.history.length === 0 ? <p className="fieldDescription">No recorded decisions yet.</p> : (
          <div className="tableResponsiveWrap"><table className="queueTable"><thead><tr><th>When</th><th>Event</th><th>By</th><th>Note</th></tr></thead><tbody>
            {app.history.map((h) => <tr key={h.id}><td>{fmt(h.createdAt)}</td><td><strong>{h.action}</strong></td><td>{h.actor}</td><td>{h.note ?? "—"}</td></tr>)}
          </tbody></table></div>)}
      </div>
    </div>
  );
}
