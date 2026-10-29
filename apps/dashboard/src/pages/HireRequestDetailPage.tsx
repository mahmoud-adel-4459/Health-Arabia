import { useEffect, useState } from "react";
import type { AdminHireRequestDetail } from "../types";
import { approveIdentityRelease, completePlacement, getAdminHireRequestDetail, rejectIdentityRelease, revokeIdentityRelease } from "../api";
import { useRouter } from "../router";
import { ConfirmDialog, ErrorState, LoadingState, StatusBadge } from "../components/ui";
import { ConversationModal } from "../components/ConversationModal";
import { CONSENT_STATUS, HISTORY_ACTION, ITEM_STATUS, RELEASE_STATUS, REQUEST_STATUS, formatDateTime, nextAction, orDash } from "../lib/format";

type Item = AdminHireRequestDetail["items"][number];
type Dialog = { kind: "approve" | "reject" | "revoke" | "complete"; item: Item } | null;

const DIALOG_COPY = {
  approve: { title: "Approve this identity release?", confirm: "Approve release", danger: false, label: "Note for the record", required: false,
    text: "The facility will be able to see this doctor's name, contact details and CV, and a three-party chat will open. This is recorded in the activity history." },
  reject: { title: "Decline this identity release?", confirm: "Decline release", danger: true, label: "Reason", required: true,
    text: "The facility will not receive the doctor's identity. The reason is saved in the activity history." },
  revoke: { title: "Revoke this identity release?", confirm: "Revoke release", danger: true, label: "Reason", required: true,
    text: "The facility loses access to the doctor's identity and documents, and the chat becomes read only. Earlier messages are kept." },
  complete: { title: "Complete this placement?", confirm: "Complete placement", danger: false, label: "Note for the record", required: false,
    text: "This marks the doctor as hired for this job. It cannot be undone." },
} as const;

export function HireRequestDetailPage({ requestId, onActionComplete }: { requestId: string; onActionComplete?: (m: string) => void }) {
  const { navigate } = useRouter();
  const [data, setData] = useState<AdminHireRequestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);

  const load = () => getAdminHireRequestDetail(requestId).then((d) => { setData(d); setError(null); }).catch((e) => setError(e.message || "Failed to load this hire request."));
  useEffect(() => { setData(null); load(); }, [requestId]);

  const run = async () => {
    if (!dialog) return;
    const copy = DIALOG_COPY[dialog.kind];
    if (copy.required && reason.trim().length < 3) {
      setActionError("Please give a reason of at least 3 characters.");
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const release = dialog.item.identityRelease;
      if (dialog.kind === "approve" && release) {
        const r = await approveIdentityRelease(release.id, reason.trim() || "Identity release approved by the platform.");
        if (r.conversation?.id) setChatId(r.conversation.id);
        onActionComplete?.("Identity release approved. The three-party chat is open.");
      } else if (dialog.kind === "reject" && release) {
        await rejectIdentityRelease(release.id, reason.trim());
        onActionComplete?.("Identity release declined.");
      } else if (dialog.kind === "revoke" && release) {
        await revokeIdentityRelease(release.id, reason.trim());
        onActionComplete?.("Identity release revoked. The chat is now read only.");
      } else if (dialog.kind === "complete") {
        await completePlacement(dialog.item.application.id, reason.trim() || undefined);
        onActionComplete?.("Placement completed.");
      }
      setDialog(null);
      setReason("");
      await load();
    } catch (e: any) {
      setActionError(e.message || "That action could not be completed.");
    } finally {
      setBusy(false);
    }
  };
  const ask = (kind: NonNullable<Dialog>["kind"], item: Item) => { setReason(""); setActionError(null); setDialog({ kind, item }); };

  if (error && !data) return (
    <div className="detailPageWrapper">
      <ErrorState message={error} onRetry={load} />
      <button type="button" className="secondaryButton" onClick={() => navigate("/hire-requests")}>Back to hire requests</button>
    </div>
  );
  if (!data) return <div className="detailPageWrapper"><LoadingState text="Loading hire request..." /></div>;

  const st = REQUEST_STATUS[data.status] ?? { label: data.status, tone: "neutral" as const };
  return (
    <div className="detailPageWrapper">
      <div className="detailTopNav"><button type="button" className="backToQueueLink" onClick={() => navigate("/hire-requests")}>← Back to hire requests</button></div>
      <div className="pageHeaderSection pageHeaderWithActions">
        <div>
          <h1 className="pageHeaderTitle">{data.job.title}</h1>
          <p className="pageHeaderSubtitle">{data.job.ref} · requested by {data.facility.name} · submitted {formatDateTime(data.submittedAt)}</p>
        </div>
        <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
      </div>
      {error && <ErrorState message={error} onRetry={load} />}

      <div className="hrDetailGrid">
        <section className="ovPanel">
          <h2 className="ovPanelTitle">Facility and recruiter</h2>
          <dl className="hrFacts" style={{ marginTop: 12 }}>
            <dt>Facility</dt><dd>{data.facility.name}</dd>
            <dt>Location</dt><dd>{[data.facility.city, data.facility.country].filter(Boolean).join(", ") || "—"}</dd>
            <dt>Recruiter</dt><dd>{orDash(data.facility.officerName)}</dd>
            <dt>Email</dt><dd>{orDash(data.facility.email)}</dd>
            <dt>Phone</dt><dd>{orDash(data.facility.phone)}</dd>
          </dl>
          <button type="button" className="secondaryButton btnCompact" style={{ marginTop: 14 }} onClick={() => navigate(`/accounts/${data.facility.accountId}`)}>Open facility account</button>
        </section>
        <section className="ovPanel">
          <h2 className="ovPanelTitle">Job</h2>
          <dl className="hrFacts" style={{ marginTop: 12 }}>
            <dt>Title</dt><dd>{data.job.title}</dd>
            <dt>Reference</dt><dd>{data.job.ref}</dd>
            <dt>Specialty</dt><dd>{orDash(data.job.specialty)}</dd>
            <dt>Location</dt><dd>{orDash(data.job.location)}</dd>
          </dl>
          <button type="button" className="secondaryButton btnCompact" style={{ marginTop: 14 }} onClick={() => navigate(`/jobs/${data.job.id}`)}>Open job</button>
        </section>
        <section className="ovPanel">
          <h2 className="ovPanelTitle">Request</h2>
          <dl className="hrFacts" style={{ marginTop: 12 }}>
            <dt>Submitted</dt><dd>{formatDateTime(data.submittedAt)}</dd>
            <dt>Closed</dt><dd>{formatDateTime(data.closedAt)}</dd>
            <dt>Coordinator</dt><dd>{data.coordinator?.name ?? "Not assigned"}</dd>
            <dt>Note from the facility</dt><dd>{orDash(data.facilityNote)}</dd>
          </dl>
        </section>
      </div>

      <h2 className="ovSectionTitle" style={{ margin: "8px 0 4px" }}>Applicants ({data.items.length})</h2>
      <p className="ovSectionHint" style={{ marginBottom: 12 }}>Doctor names and contact details below are visible to the platform only. A facility sees them only after the doctor agrees and you approve the release.</p>
      {data.items.map((it) => {
        const next = nextAction({ status: it.status, identityRelease: it.identityRelease ? { status: it.identityRelease.status, doctorConsentStatus: it.identityRelease.doctorConsentStatus, conversation: it.identityRelease.conversation } : null });
        const r = it.identityRelease;
        const item = ITEM_STATUS[it.status] ?? { label: it.status, tone: "neutral" as const };
        const consent = CONSENT_STATUS[r?.doctorConsentStatus ?? "PENDING"];
        const release = RELEASE_STATUS[r?.status ?? "PENDING"];
        const doc = it.application.doctor;
        return (
          <article key={it.id} className="hrApplicantCard">
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div className="hrCode">{it.application.candidateCode}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--navy)" }}>{doc.fullName}</div>
                <div className="hrNext">{it.application.specialty} · {it.application.yearsOfExperience} yrs · {it.application.anonymousJobTitle}</div>
              </div>
              <div className="hrBadges">
                <StatusBadge tone={item.tone}>{item.label}</StatusBadge>
                <StatusBadge tone={consent.tone}>{consent.label}</StatusBadge>
                <StatusBadge tone={release.tone}>{release.label}</StatusBadge>
              </div>
            </div>
            <dl className="hrFacts" style={{ marginTop: 12 }}>
              <dt>Email</dt><dd>{orDash(doc.email)}</dd>
              <dt>Phone</dt><dd>{orDash(doc.phone)}</dd>
              <dt>Nationality</dt><dd>{orDash(doc.nationality)}</dd>
              {r && <><dt>Doctor decided</dt><dd>{formatDateTime(r.doctorConsentAt)}</dd></>}
              {r?.decidedAt && <><dt>Release decision</dt><dd>{formatDateTime(r.decidedAt)}{r.decidedBy ? ` by ${r.decidedBy.name}` : " (recorded automatically)"}{r.decisionNote ? ` — ${r.decisionNote}` : ""}</dd></>}
              {r?.revokedAt && <><dt>Revoked</dt><dd>{formatDateTime(r.revokedAt)}{r.revocationReason ? ` — ${r.revocationReason}` : ""}</dd></>}
            </dl>
            <div className={`hrNext ${next.kind === "decide" || next.kind === "complete" ? "hrNextNeeds" : ""}`} style={{ marginTop: 12, fontSize: 14 }}>Next step: {next.text}</div>
            <div className="rowActions" style={{ justifyContent: "flex-start", marginTop: 12 }}>
              {next.kind === "decide" && (
                <>
                  <button type="button" className="btnApproveAction" onClick={() => ask("approve", it)}>Approve release</button>
                  <button type="button" className="btnRejectAction" onClick={() => ask("reject", it)}>Decline release</button>
                </>
              )}
              {next.kind === "complete" && <button type="button" className="btnApproveAction" onClick={() => ask("complete", it)}>Complete placement</button>}
              {r?.status === "APPROVED" && it.status !== "HIRED" && <button type="button" className="btnRejectAction" onClick={() => ask("revoke", it)}>Revoke release</button>}
              {r?.conversation && <button type="button" className="secondaryButton" onClick={() => setChatId(r.conversation!.id)}>{r.conversation.status === "READ_ONLY" ? "View chat history" : "Open chat"}</button>}
              <button type="button" className="secondaryButton" onClick={() => navigate(`/applications/${it.application.id}`)}>Open application</button>
            </div>
          </article>
        );
      })}

      <section className="ovPanel" style={{ marginTop: 16 }}>
        <h2 className="ovPanelTitle">History</h2>
        <p className="ovPanelNote">Everything that happened on this request, oldest first.</p>
        <ul className="hrTimeline">
          <li><strong>Request submitted</strong><div className="hrNext">{formatDateTime(data.submittedAt)} · {data.facility.name}</div></li>
          {data.history.map((h, i) => (
            <li key={i}>
              <strong>{HISTORY_ACTION[h.action] ?? h.action.toLowerCase().replace(/_/g, " ")}</strong>{h.candidateCode ? ` · ${h.candidateCode}` : ""}
              <div className="hrNext">{formatDateTime(h.at)} · {h.actor}</div>
              {h.reason && <div className="hrNext">“{h.reason}”</div>}
            </li>
          ))}
        </ul>
      </section>

      {dialog && (
        <ConfirmDialog
          title={DIALOG_COPY[dialog.kind].title}
          message={<>{DIALOG_COPY[dialog.kind].text}<br /><strong>{dialog.item.application.candidateCode}</strong></>}
          confirmLabel={DIALOG_COPY[dialog.kind].confirm}
          danger={DIALOG_COPY[dialog.kind].danger}
          busy={busy}
          error={actionError}
          reasonLabel={DIALOG_COPY[dialog.kind].label}
          reasonRequired={DIALOG_COPY[dialog.kind].required}
          reason={reason}
          onReason={setReason}
          onConfirm={run}
          onCancel={() => !busy && setDialog(null)}
        />
      )}
      {chatId && <ConversationModal conversationId={chatId} onClose={() => { setChatId(null); load(); }} />}
    </div>
  );
}
