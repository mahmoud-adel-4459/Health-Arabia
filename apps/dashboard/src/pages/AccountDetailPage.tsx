import { useState, useEffect } from "react";
import type { AccountDetail } from "../types";
import { getAccountDetail, approveAccount, rejectAccount, suspendAccount, unsuspendAccount, getFileDownloadUrl, setFacilityPublicListing } from "../api";
import { useRouter } from "../router";

interface AccountDetailPageProps {
  accountId: string;
  onActionComplete?: (message: string) => void;
}

export function AccountDetailPage({ accountId, onActionComplete }: AccountDetailPageProps) {
  const { navigate } = useRouter();

  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Approval state
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approveNote, setApproveNote] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Rejection state
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Suspension state
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showUnsuspendDialog, setShowUnsuspendDialog] = useState(false);
  const [unsuspendReason, setUnsuspendReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");

  // Success Feedback
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // Public Hospitals-directory listing (facility accounts)
  const [listingSubmitting, setListingSubmitting] = useState(false);
  const [listingError, setListingError] = useState<string | null>(null);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAccountDetail(accountId);
      setAccount(data);
    } catch (err: any) {
      setError(err.message || "Failed to load account details. Account may not exist or has been removed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [accountId]);

  const handleApprove = async () => {
    if (!account) return;
    if (account.status === "REJECTED" && approveNote.trim().length < 3) {
      setActionError("A reason of at least 3 characters is required to review a rejected account again.");
      return;
    }
    setActionError(null);
    setActionSubmitting(true);

    try {
      await approveAccount(account.id, approveNote.trim() || undefined);
      setShowApproveDialog(false);
      setApproveNote("");
      const msg = `Account "${account.displayName || account.email}" has been successfully APPROVED.`;
      setFeedbackBanner(msg);
      if (onActionComplete) onActionComplete(msg);
      // Refresh current account details
      await fetchDetail();
    } catch (err: any) {
      setActionError(err.message || "Failed to approve account.");
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleTogglePublicListing = async (enabled: boolean) => {
    if (!account) return;
    setListingError(null);
    setListingSubmitting(true);
    try {
      const result = await setFacilityPublicListing(account.id, enabled);
      setFeedbackBanner(result.message);
      if (onActionComplete) onActionComplete(result.message);
      await fetchDetail();
    } catch (err: any) {
      setListingError(err.message || "Failed to update the public listing.");
    } finally {
      setListingSubmitting(false);
    }
  };

  const handleSuspend = async () => {
    if (!account) return;
    const cleanReason = suspendReason.trim();
    if (cleanReason.length < 3) {
      setActionError("A specific suspension reason of at least 3 characters is mandatory.");
      return;
    }
    setActionError(null);
    setActionSubmitting(true);
    try {
      await suspendAccount(account.id, cleanReason);
      setShowSuspendDialog(false);
      setSuspendReason("");
      const msg = `Account "${account.displayName || account.email}" has been SUSPENDED.`;
      setFeedbackBanner(msg);
      if (onActionComplete) onActionComplete(msg);
      await fetchDetail();
    } catch (err: any) {
      setActionError(err.message || "Failed to suspend account.");
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleUnsuspend = async () => {
    if (!account) return;
    const cleanReason = unsuspendReason.trim();
    if (cleanReason.length < 3) {
      setActionError("A reason of at least 3 characters is required to lift a suspension.");
      return;
    }
    setActionError(null);
    setActionSubmitting(true);
    try {
      await unsuspendAccount(account.id, cleanReason);
      setShowUnsuspendDialog(false);
      setUnsuspendReason("");
      const msg = `Account "${account.displayName || account.email}" is APPROVED again. The user must sign in again${account.role === "FACILITY" ? "; the public directory listing stays off until you enable it" : ""}.`;
      setFeedbackBanner(msg);
      if (onActionComplete) onActionComplete(msg);
      await fetchDetail();
    } catch (err: any) {
      setActionError(err.message || "Failed to unsuspend account.");
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!account) return;
    const cleanReason = rejectReason.trim();
    if (!cleanReason || cleanReason.length < 3) {
      setActionError("A specific rejection reason of at least 3 characters is mandatory.");
      return;
    }
    setActionError(null);
    setActionSubmitting(true);

    try {
      await rejectAccount(account.id, cleanReason);
      setShowRejectDialog(false);
      const msg = `Account "${account.displayName || account.email}" has been REJECTED.`;
      setFeedbackBanner(msg);
      if (onActionComplete) onActionComplete(msg);
      // Refresh current account details
      await fetchDetail();
    } catch (err: any) {
      setActionError(err.message || "Failed to reject account.");
    } finally {
      setActionSubmitting(false);
    }
  };

  function formatDate(val: string | null) {
    if (!val) return "—";
    try {
      const d = new Date(val);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return val;
    }
  }

  function formatBytes(bytes?: number) {
    if (!bytes) return "";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  }

  // Loading skeleton state
  if (loading) {
    return (
      <div className="detailPageWrapper">
        <div className="detailHeaderSkeleton">
          <div className="skeletonLine skeletonTitle" />
          <div className="skeletonLine skeletonSubtitle" />
        </div>
        <div className="detailCardsGrid">
          <div className="skeletonCard" style={{ height: "260px" }} />
          <div className="skeletonCard" style={{ height: "340px" }} />
          <div className="skeletonCard" style={{ height: "280px" }} />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !account) {
    return (
      <div className="detailPageWrapper">
        <button
          type="button"
          className="backToQueueLink"
          onClick={() => navigate("/accounts")}
        >
          ← Return to Review Queue
        </button>

        <div className="detailErrorState">
          <div className="errorIconWrapper">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="errorStateTitle">Account Inspection Error</h2>
          <p className="errorStateDesc">{error || "Account could not be found."}</p>
          <div className="errorActionRow">
            <button type="button" className="retryButton" onClick={fetchDetail}>
              Try Again
            </button>
            <button type="button" className="secondaryButton" onClick={() => navigate("/accounts")}>
              Back to Queue
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isPending = account.status === "PENDING_REVIEW";
  const isApproved = account.status === "APPROVED";
  const isRejected = account.status === "REJECTED";
  const isSuspended = account.status === "SUSPENDED";
  const canSuspend = isApproved && (account.role === "DOCTOR" || account.role === "FACILITY");

  return (
    <div className="detailPageWrapper">
      {/* Top Navigation & Breadcrumbs */}
      <div className="detailTopNav">
        <button
          type="button"
          className="backToQueueLink"
          onClick={() => navigate("/accounts")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to Review Queue</span>
        </button>
      </div>

      {/* Success Feedback Banner */}
      {feedbackBanner && (
        <div className="detailFeedbackBanner" role="status">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#16a34a"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{feedbackBanner}</span>
          <button
            type="button"
            className="alertCloseBtn"
            onClick={() => setFeedbackBanner(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Sticky Inspection Header */}
      <section className="detailStickyHeader">
        <div className="detailHeaderInfo">
          <div className="detailBadgeRow">
            <span className={`roleBadge roleBadge-${account.role.toLowerCase()}`}>
              {account.role === "DOCTOR" ? "Doctor Candidate" : "Healthcare Facility"}
            </span>

            <span className={`statusPill statusPill-${account.status.toLowerCase()}`}>
              {account.status.replace("_", " ")}
            </span>
          </div>

          <h1 className="detailAccountName">
            {account.displayName ||
              (account.role === "FACILITY"
                ? account.facility?.name
                : account.doctorProfile?.fullName) ||
              account.email ||
              "Unnamed Account"}
          </h1>

          <div className="detailAccountMetaRow">
            <span className="metaItem">
              <strong>ID:</strong> <code className="idCode">{account.id}</code>
            </span>
            <span className="metaItem">
              <strong>Registered:</strong> {formatDate(account.createdAt)}
            </span>
            {account.submittedForReviewAt && (
              <span className="metaItem">
                <strong>Submitted for Review:</strong> {formatDate(account.submittedForReviewAt)}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons in Header */}
        <div className="detailHeaderActions">
          {isPending ? (
            <div className="pendingActionGroup">
              <button
                type="button"
                className="btnApproveAction"
                onClick={() => {
                  setActionError(null);
                  setShowApproveDialog(true);
                  setShowRejectDialog(false);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Approve Account</span>
              </button>

              <button
                type="button"
                className="btnRejectAction"
                onClick={() => {
                  setActionError(null);
                  setShowRejectDialog(true);
                  setShowApproveDialog(false);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span>Reject Account</span>
              </button>
            </div>
          ) : isApproved ? (
            <div className="decisionStatusBanner approvedBanner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <div>
                <strong>Approved Account</strong>
                <span className="decisionSub">
                  Verified by {account.reviewedBy?.displayName || account.reviewedBy?.email || "Platform Admin"} on{" "}
                  {formatDate(account.reviewedAt)}
                </span>
              </div>
            </div>
          ) : isRejected ? (
            <div className="decisionStatusBanner rejectedBanner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <strong>Declined Account</strong>
                <span className="decisionSub">
                  Declined by {account.reviewedBy?.displayName || account.reviewedBy?.email || "Platform Admin"} on{" "}
                  {formatDate(account.reviewedAt)}
                  {account.reviewNote ? ` — "${account.reviewNote}"` : ""}
                </span>
              </div>
            </div>
          ) : null}
          {isRejected && (
            <button
              type="button"
              className="btnApproveAction"
              onClick={() => {
                setActionError(null);
                setShowApproveDialog(true);
                setShowRejectDialog(false);
              }}
            >
              <span>Review again</span>
            </button>
          )}
          {isSuspended && (
            <button
              type="button"
              className="btnApproveAction"
              onClick={() => {
                setActionError(null);
                setShowUnsuspendDialog(true);
              }}
            >
              <span>Unsuspend</span>
            </button>
          )}
          {isSuspended && (
            <div className="decisionStatusBanner rejectedBanner">
              <div>
                <strong>Suspended Account</strong>
                <span className="decisionSub">
                  Suspended by {account.reviewedBy?.displayName || account.reviewedBy?.email || "Platform Admin"} on {formatDate(account.reviewedAt)}
                  {account.reviewNote ? ` — "${account.reviewNote}"` : ""}. Sign-in is blocked until the suspension is lifted.
                </span>
              </div>
            </div>
          )}
          {account.status === "DEACTIVATED" && (
            <div className="decisionStatusBanner rejectedBanner">
              <div>
                <strong>Deactivated Account</strong>
                <span className="decisionSub">Closed through an account deletion request. Records are kept; this is final.</span>
              </div>
            </div>
          )}
          {canSuspend && (
            <button
              type="button"
              className="btnRejectAction"
              onClick={() => {
                setActionError(null);
                setShowSuspendDialog(true);
              }}
            >
              <span>Suspend Account</span>
            </button>
          )}
        </div>
      </section>

      {showUnsuspendDialog && (
        <div className="modalBackdrop" role="dialog" aria-modal="true" aria-label="Unsuspend account">
          <div className="modalCard" style={{ maxWidth: "560px" }}>
            <h3 className="modalTitle">Unsuspend this account?</h3>
            <p className="modalSubtitle" style={{ marginTop: "8px" }}>
              <strong>{account.displayName || account.email}</strong> will be APPROVED again and can sign in with a new session; earlier sessions are not restored.
              {account.role === "FACILITY" ? " The hospital stays out of the public Hospitals directory until you enable the listing again. Its jobs that are still published become visible once the account is approved." : ""} The suspension stays in the history.
            </p>
            {actionError && <div className="modalErrorMessage">{actionError}</div>}
            <div style={{ marginTop: "16px" }}>
              <label htmlFor="unsuspend-reason" style={{ fontSize: "13px", fontWeight: 700, color: "var(--navy)", display: "block", marginBottom: "6px" }}>
                Reason for lifting the suspension *
              </label>
              <textarea id="unsuspend-reason" className="rejectionTextarea" rows={4} value={unsuspendReason} onChange={(e) => setUnsuspendReason(e.target.value)} disabled={actionSubmitting} />
            </div>
            <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button type="button" className="secondaryButton" onClick={() => setShowUnsuspendDialog(false)} disabled={actionSubmitting}>Cancel</button>
              <button type="button" className="confirmApproveBtn" onClick={handleUnsuspend} disabled={actionSubmitting}>
                {actionSubmitting ? "Unsuspending..." : "Unsuspend account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuspendDialog && (
        <div className="modalBackdrop" role="dialog" aria-modal="true" aria-label="Suspend account">
          <div className="modalCard" style={{ maxWidth: "560px" }}>
            <h3 className="modalTitle">Suspend this account?</h3>
            <p className="modalSubtitle" style={{ marginTop: "8px" }}>
              <strong>{account.displayName || account.email}</strong> will be signed out everywhere and blocked from signing in or acting on the platform.
              {account.role === "FACILITY" ? " If the hospital is listed publicly it is removed from the Hospitals directory." : ""} Applications, hire requests, chats and the audit history are kept.
              This cannot be undone from the dashboard.
            </p>
            {actionError && <div className="modalErrorMessage">{actionError}</div>}
            <div style={{ marginTop: "16px" }}>
              <label htmlFor="suspend-reason" style={{ fontSize: "13px", fontWeight: 700, color: "var(--navy)", display: "block", marginBottom: "6px" }}>
                Reason for suspension *
              </label>
              <textarea
                id="suspend-reason"
                className="rejectionTextarea"
                rows={4}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                disabled={actionSubmitting}
              />
            </div>
            <div className="modalActions" style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button type="button" className="secondaryButton" onClick={() => setShowSuspendDialog(false)} disabled={actionSubmitting}>Cancel</button>
              <button type="button" className="confirmRejectBtn" onClick={handleSuspend} disabled={actionSubmitting}>
                {actionSubmitting ? "Suspending..." : "Suspend account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Card for Approval */}
      {showApproveDialog && (
        <section className="actionConfirmationCard approveCard" role="region" aria-label="Approve confirmation">
          <div className="actionCardHeader">
            <div className="actionCardTitleRow">
              <span className="actionIconBadge iconBadgeApprove">✓</span>
              <div>
                <h3 className="actionCardTitle">Confirm Account Approval</h3>
                <p className="actionCardSubtitle">
                  This will transition the account to APPROVED, grant platform access, and record your decision in the permanent audit trail.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="alertCloseBtn"
              onClick={() => setShowApproveDialog(false)}
            >
              ×
            </button>
          </div>

          {actionError && <div className="actionErrorBanner">{actionError}</div>}

          <div className="formGroup" style={{ marginTop: "16px" }}>
            <label htmlFor="approve-note" className="formLabel">
              {isRejected ? "Reason for approving this rejected account again *" : "Approval Note (Optional administrator note)"}
            </label>
            <input
              id="approve-note"
              type="text"
              className="formInput"
              placeholder="e.g. Verified medical license with Saudi Commission / Valid clinic registration"
              value={approveNote}
              onChange={(e) => setApproveNote(e.target.value)}
              disabled={actionSubmitting}
            />
          </div>

          <div className="actionCardButtons">
            <button
              type="button"
              className="confirmApproveBtn"
              onClick={handleApprove}
              disabled={actionSubmitting}
            >
              {actionSubmitting ? "Approving..." : isRejected ? "Confirm & review again" : "Confirm & Approve Account"}
            </button>
            <button
              type="button"
              className="cancelActionBtn"
              onClick={() => setShowApproveDialog(false)}
              disabled={actionSubmitting}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* Confirmation Card for Rejection */}
      {showRejectDialog && (
        <section className="actionConfirmationCard rejectCard" role="region" aria-label="Reject confirmation">
          <div className="actionCardHeader">
            <div className="actionCardTitleRow">
              <span className="actionIconBadge iconBadgeReject">✕</span>
              <div>
                <h3 className="actionCardTitle">Confirm Account Rejection</h3>
                <p className="actionCardSubtitle">
                  This will decline the account, revoke any active login sessions, and save the mandatory rejection reason.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="alertCloseBtn"
              onClick={() => setShowRejectDialog(false)}
            >
              ×
            </button>
          </div>

          {actionError && <div className="actionErrorBanner">{actionError}</div>}

          <div className="formGroup" style={{ marginTop: "16px" }}>
            <label htmlFor="reject-reason" className="formLabel">
              Reason for Rejection <span style={{ color: "var(--danger)" }}>* (Required)</span>
            </label>
            <textarea
              id="reject-reason"
              className="formInput formTextarea"
              rows={3}
              placeholder="Provide a clear, actionable explanation (e.g., Incomplete medical council license document, expired certificate, unverifiable institution email)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              disabled={actionSubmitting}
              required
            />
          </div>

          <div className="actionCardButtons">
            <button
              type="button"
              className="confirmRejectBtn"
              onClick={handleReject}
              disabled={actionSubmitting || !rejectReason.trim()}
            >
              {actionSubmitting ? "Declining..." : "Confirm & Reject Account"}
            </button>
            <button
              type="button"
              className="cancelActionBtn"
              onClick={() => setShowRejectDialog(false)}
              disabled={actionSubmitting}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* Two Column Modular Grid */}
      <div className="detailMainGrid">
        {/* Left Column: Comprehensive Profile & Submitted Credentials */}
        <div className="detailLeftCol">
          {/* FACILITY SPECIFIC PRESENTATION */}
          {account.role === "FACILITY" && account.facility && (
            <>
              {/* Institutional Overview Card */}
              <div className="contentCard">
                <div className="cardHeader">
                  <h2 className="cardTitle">Institutional Details</h2>
                  <span className="cardPill">Hospital / Clinic</span>
                </div>

                <div className="profileInfoGrid">
                  <div className="profileField">
                    <span className="fieldLabel">Official Facility Name</span>
                    <span className="fieldValue highlightValue">{account.facility.name}</span>
                  </div>

                  <div className="profileField">
                    <span className="fieldLabel">Facility Type</span>
                    <span className="fieldValue">{account.facility.type || "General Hospital"}</span>
                  </div>

                  <div className="profileField">
                    <span className="fieldLabel">Beds / Employee Capacity</span>
                    <span className="fieldValue">
                      {account.facility.employeeCount
                        ? `${account.facility.employeeCount} Beds / Capacity`
                        : "Not specified"}
                    </span>
                  </div>

                  <div className="profileField">
                    <span className="fieldLabel">Location & City</span>
                    <span className="fieldValue">
                      {account.facility.city || "—"}
                      {account.facility.country ? `, ${account.facility.country}` : ""}
                    </span>
                  </div>

                  <div className="profileField" style={{ gridColumn: "1 / -1" }}>
                    <span className="fieldLabel">Physical Street Address</span>
                    <span className="fieldValue">{account.facility.address || "Not specified"}</span>
                  </div>

                  {account.facility.locationUrl && (
                    <div className="profileField" style={{ gridColumn: "1 / -1" }}>
                      <span className="fieldLabel">Website / Online Profile</span>
                      <a
                        href={account.facility.locationUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="fieldLink"
                      >
                        {account.facility.locationUrl} ↗
                      </a>
                    </div>
                  )}

                  {account.facility.description && (
                    <div className="profileField" style={{ gridColumn: "1 / -1" }}>
                      <span className="fieldLabel">About Institution</span>
                      <p className="fieldDescription">{account.facility.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* CRITICAL: Email Separation Card */}
              <div className="contentCard">
                <div className="cardHeader">
                  <h2 className="cardTitle">Email & Administrative Contacts</h2>
                  <span className="cardPill">Security & Verification</span>
                </div>

                <div className="emailDistinctionGrid">
                  <div className="emailCard highlightEmailCard">
                    <div className="emailCardHeader">
                      <span className="emailBadgeTag institutionTag">Institution Email</span>
                      <span className="emailDescNote">Official Correspondence</span>
                    </div>
                    <div className="emailDisplayValue">
                      {account.facility.hospitalEmail || "Not provided"}
                    </div>
                    <p className="emailHelpText">
                      Used for official hospital communications and public institutional listing.
                    </p>
                  </div>

                  <div className="emailCard">
                    <div className="emailCardHeader">
                      <span className="emailBadgeTag officerTag">Login / Officer Email</span>
                      <span className="emailDescNote">Account Credentials</span>
                    </div>
                    <div className="emailDisplayValue">{account.email}</div>
                    <p className="emailHelpText">
                      Authentication email bound to recruitment officer:{" "}
                      <strong>{account.facility.officerName || "HR Officer"}</strong>
                      {account.facility.officerPhone && (
                        <span>
                          {" "}
                          ({account.facility.officerPhoneCountryCode || ""} {account.facility.officerPhone})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Public Hospitals Directory listing (platform-controlled) */}
              <div className="contentCard">
                <div className="cardHeader">
                  <h2 className="cardTitle">Public Hospitals Directory</h2>
                  <span className="cardPill">{account.facility.publicListing?.isListedPublicly ? "Listed" : "Not listed"}</span>
                </div>

                <div className="profileInfoGrid">
                  <div className="profileField">
                    <span className="fieldLabel">Listing Status</span>
                    <span className="fieldValue highlightValue">
                      {account.facility.publicListing?.isListedPublicly
                        ? "Visible in the public Hospitals directory"
                        : "Hidden from the public Hospitals directory"}
                    </span>
                  </div>
                  <div className="profileField">
                    <span className="fieldLabel">Last Enabled</span>
                    <span className="fieldValue">
                      {account.facility.publicListing?.enabledAt
                        ? `${new Date(account.facility.publicListing.enabledAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}${
                            account.facility.publicListing.enabledBy ? ` by ${account.facility.publicListing.enabledBy.name}` : ""
                          }`
                        : "Never enabled"}
                    </span>
                  </div>
                </div>

                <p className="fieldDescription" style={{ marginTop: "12px" }}>
                  Only approved facilities can be listed. Job listings stay anonymous either way: the directory never links
                  a facility to its jobs or recruitment contact.
                </p>

                {listingError && (
                  <div className="actionErrorBanner" role="alert" style={{ marginTop: "12px" }}>
                    {listingError}
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "16px" }}>
                  {account.facility.publicListing?.isListedPublicly ? (
                    <button
                      type="button"
                      className="btnRejectAction"
                      disabled={listingSubmitting}
                      onClick={() => handleTogglePublicListing(false)}
                    >
                      {listingSubmitting ? "Updating..." : "Remove from Directory"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btnApproveAction"
                      disabled={listingSubmitting || account.status !== "APPROVED"}
                      title={account.status !== "APPROVED" ? "Approve the facility account before listing it publicly." : undefined}
                      onClick={() => handleTogglePublicListing(true)}
                    >
                      {listingSubmitting ? "Updating..." : "List in Public Directory"}
                    </button>
                  )}
                  {account.status !== "APPROVED" && !account.facility.publicListing?.isListedPublicly && (
                    <span className="fieldDescription" style={{ alignSelf: "center", margin: 0 }}>
                      Available after the facility account is approved.
                    </span>
                  )}
                </div>
              </div>

              {/* Facility Inquiry Message Card */}
              <div className="contentCard">
                <div className="cardHeader">
                  <h2 className="cardTitle">Facility Inquiry Message</h2>
                  <span className="cardPill messagePill">Submitted Notes</span>
                </div>

                {account.facility.inquiryMessage ? (
                  <div className="inquiryMessageBox">
                    <div className="inquiryIconQuote">“</div>
                    <p className="inquiryMessageText">{account.facility.inquiryMessage}</p>
                    <div className="inquiryFooter">
                      — Submitted by {account.facility.officerName || "Recruitment Officer"} during facility registration
                    </div>
                  </div>
                ) : (
                  <div className="emptySubCard">
                    <p className="emptySubText">No specific inquiry message was provided during registration.</p>
                  </div>
                )}
              </div>

              {/* Facility Logo Document */}
              <div className="contentCard">
                <div className="cardHeader">
                  <h2 className="cardTitle">Private Brand Assets & Logo</h2>
                  <span className="cardPill">Authorized Access Only</span>
                </div>

                {account.facility.logo ? (
                  <div className="docDownloadCard">
                    <div className="docFileMeta">
                      <div className="docFileIcon logoFileIcon">LOGO</div>
                      <div>
                        <div className="docFileName">{account.facility.logo.name}</div>
                        <div className="docFileSize">
                          {formatBytes(account.facility.logo.sizeBytes)} • {account.facility.logo.mimeType}
                        </div>
                      </div>
                    </div>

                    <a
                      href={getFileDownloadUrl(account.facility.logo.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="docDownloadBtn"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span>Download Logo</span>
                    </a>
                  </div>
                ) : (
                  <div className="emptySubCard">
                    <p className="emptySubText">No institutional logo file was attached.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* DOCTOR SPECIFIC PRESENTATION */}
          {account.role === "DOCTOR" && (
            <>
              {/* Doctor Profile Overview Card */}
              <div className="contentCard">
                <div className="cardHeader">
                  <h2 className="cardTitle">Professional Profile</h2>
                  <span className="cardPill">Doctor Information</span>
                </div>

                <div className="profileInfoGrid">
                  <div className="profileField">
                    <span className="fieldLabel">Full Name</span>
                    <span className="fieldValue highlightValue">
                      {account.doctorProfile?.fullName || account.displayName || "—"}
                    </span>
                  </div>

                  <div className="profileField">
                    <span className="fieldLabel">Primary Specialty</span>
                    <span className="fieldValue">{account.doctorProfile?.specialty || "—"}</span>
                  </div>

                  <div className="profileField">
                    <span className="fieldLabel">Professional Job Title</span>
                    <span className="fieldValue">{account.doctorProfile?.jobTitle || "Physician"}</span>
                  </div>

                  <div className="profileField">
                    <span className="fieldLabel">Years of Clinical Experience</span>
                    <span className="fieldValue">
                      {account.doctorProfile?.yearsOfExperience != null
                        ? `${account.doctorProfile.yearsOfExperience} Years`
                        : "—"}
                    </span>
                  </div>

                  <div className="profileField">
                    <span className="fieldLabel">Country of Residence</span>
                    <span className="fieldValue">{account.doctorProfile?.residenceCountry || "—"}</span>
                  </div>

                  <div className="profileField">
                    <span className="fieldLabel">Nationality</span>
                    <span className="fieldValue">{account.doctorProfile?.nationality || "—"}</span>
                  </div>

                  <div className="profileField">
                    <span className="fieldLabel">Gender & Date of Birth</span>
                    <span className="fieldValue">
                      {account.doctorProfile?.gender || "—"}
                      {account.doctorProfile?.dateOfBirth ? ` • ${account.doctorProfile.dateOfBirth}` : ""}
                    </span>
                  </div>

                  <div className="profileField">
                    <span className="fieldLabel">Current Hospital / Position</span>
                    <span className="fieldValue">{account.doctorProfile?.currentPosition || "—"}</span>
                  </div>

                  {account.doctorProfile?.about && (
                    <div className="profileField" style={{ gridColumn: "1 / -1" }}>
                      <span className="fieldLabel">Executive Biography</span>
                      <p className="fieldDescription">{account.doctorProfile.about}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Private Documents Card (CV & Photo) */}
              <div className="contentCard">
                <div className="cardHeader">
                  <h2 className="cardTitle">Confidential Documents & Credentials</h2>
                  <span className="cardPill">Private Authorization</span>
                </div>

                <div className="docCardsList">
                  {account.doctorProfile?.cv ? (
                    <div className="docDownloadCard">
                      <div className="docFileMeta">
                        <div className="docFileIcon cvFileIcon">CV</div>
                        <div>
                          <div className="docFileName">{account.doctorProfile.cv.name}</div>
                          <div className="docFileSize">
                            {formatBytes(account.doctorProfile.cv.sizeBytes)} • {account.doctorProfile.cv.mimeType}
                          </div>
                        </div>
                      </div>

                      <a
                        href={getFileDownloadUrl(account.doctorProfile.cv.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="docDownloadBtn"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span>Download CV</span>
                      </a>
                    </div>
                  ) : (
                    <div className="emptySubCard">
                      <p className="emptySubText">No CV document on file.</p>
                    </div>
                  )}

                  {account.doctorProfile?.photo && (
                    <div className="docDownloadCard">
                      <div className="docFileMeta">
                        <div className="docFileIcon photoFileIcon">IMG</div>
                        <div>
                          <div className="docFileName">{account.doctorProfile.photo.name}</div>
                          <div className="docFileSize">Profile Photograph</div>
                        </div>
                      </div>

                      <a
                        href={getFileDownloadUrl(account.doctorProfile.photo.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="docDownloadBtn"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span>View Photo</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Medical Licenses Card */}
              <div className="contentCard">
                <div className="cardHeader">
                  <h2 className="cardTitle">Medical & Healthcare Licenses</h2>
                  <span className="cardPill">
                    {account.doctorProfile?.licenses?.length || 0} Listed
                  </span>
                </div>

                {account.doctorProfile?.licenses && account.doctorProfile.licenses.length > 0 ? (
                  <div className="licensesTableWrapper">
                    <table className="detailSubTable">
                      <thead>
                        <tr>
                          <th>License / Council</th>
                          <th>Registration #</th>
                          <th>Issuing Authority</th>
                          <th>Expiry Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {account.doctorProfile.licenses.map((lic) => (
                          <tr key={lic.id}>
                            <td>
                              <strong>{lic.licenseType}</strong>
                            </td>
                            <td>
                              <code className="idCode">{lic.registrationNumber}</code>
                            </td>
                            <td>{lic.issuingAuthority}</td>
                            <td>{formatDate(lic.expiryDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="emptySubCard">
                    <p className="emptySubText">No specific medical licenses entered.</p>
                  </div>
                )}
              </div>

              {/* Education & Qualifications */}
              <div className="contentCard">
                <div className="cardHeader">
                  <h2 className="cardTitle">Education & Medical Qualifications</h2>
                  <span className="cardPill">
                    {account.doctorProfile?.educations?.length || 0} Records
                  </span>
                </div>

                {account.doctorProfile?.educations && account.doctorProfile.educations.length > 0 ? (
                  <div className="timelineList">
                    {account.doctorProfile.educations.map((edu) => (
                      <div key={edu.id} className="timelineEntry">
                        <div className="timelineDot" />
                        <div className="timelineContent">
                          <div className="timelineHeadingRow">
                            <span className="timelineTitle">{edu.degree}</span>
                            <span className="timelineYearPill">{edu.graduationYear}</span>
                          </div>
                          <div className="timelineSub">{edu.institution}</div>
                          {edu.isPrimary && <span className="primaryTag">Primary Medical Qualification</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="emptySubCard">
                    <p className="emptySubText">No education history recorded.</p>
                  </div>
                )}
              </div>

              {/* Clinical Experience History */}
              <div className="contentCard">
                <div className="cardHeader">
                  <h2 className="cardTitle">Professional Experience History</h2>
                  <span className="cardPill">
                    {account.doctorProfile?.experiences?.length || 0} Roles
                  </span>
                </div>

                {account.doctorProfile?.experiences && account.doctorProfile.experiences.length > 0 ? (
                  <div className="timelineList">
                    {account.doctorProfile.experiences.map((exp) => (
                      <div key={exp.id} className="timelineEntry">
                        <div className="timelineDot" />
                        <div className="timelineContent">
                          <div className="timelineHeadingRow">
                            <span className="timelineTitle">{exp.position}</span>
                            <span className="timelinePeriod">
                              {formatDate(exp.startDate)} — {exp.endDate ? formatDate(exp.endDate) : "Present"}
                            </span>
                          </div>
                          <div className="timelineSub">{exp.organization}</div>
                          {exp.responsibilities && (
                            <p className="timelineBody">{exp.responsibilities}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="emptySubCard">
                    <p className="emptySubText">No past experience entries listed.</p>
                  </div>
                )}
              </div>

              {/* Languages */}
              <div className="contentCard">
                <div className="cardHeader">
                  <h2 className="cardTitle">Languages Spoken</h2>
                  <span className="cardPill">{account.doctorProfile?.languages?.length || 0}</span>
                </div>

                {account.doctorProfile?.languages && account.doctorProfile.languages.length > 0 ? (
                  <div className="languagesPillsRow">
                    {account.doctorProfile.languages.map((l, i) => (
                      <div key={i} className="languageBadge">
                        <span className="langName">{l.language}</span>
                        <span className="langProf">{l.proficiency}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="emptySubCard">
                    <p className="emptySubText">No languages specified.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Column: Contact info & Entity Audit Trail */}
        <div className="detailRightCol">
          {/* Contact Verification Card */}
          <div className="contentCard">
            <div className="cardHeader">
              <h2 className="cardTitle">Account Contact</h2>
            </div>

            <div className="contactList">
              <div className="contactRow">
                <span className="contactLabel">Primary Email</span>
                <span className="contactValue">{account.email || "—"}</span>
              </div>

              <div className="contactRow">
                <span className="contactLabel">Mobile (E.164)</span>
                <span className="contactValue">{account.mobileE164 || "—"}</span>
              </div>

              <div className="contactRow">
                <span className="contactLabel">Role Type</span>
                <span className="contactValue">{account.role}</span>
              </div>

              <div className="contactRow">
                <span className="contactLabel">Account Status</span>
                <span className={`statusPill statusPill-${account.status.toLowerCase()}`}>
                  {account.status}
                </span>
              </div>
            </div>
          </div>

          {/* Decision Record Card */}
          {account.reviewedAt && (
            <div className="contentCard">
              <div className="cardHeader">
                <h2 className="cardTitle">Review Decision Record</h2>
              </div>

              <div className="decisionMetaBox">
                <div className="decisionMetaRow">
                  <span className="metaLabel">Reviewer:</span>
                  <span className="metaVal">
                    {account.reviewedBy?.displayName || account.reviewedBy?.email || "Platform Admin"}
                  </span>
                </div>

                <div className="decisionMetaRow">
                  <span className="metaLabel">Decided At:</span>
                  <span className="metaVal">{formatDate(account.reviewedAt)}</span>
                </div>

                {account.reviewNote && (
                  <div className="decisionMetaNote">
                    <span className="metaLabel">Decision Note:</span>
                    <p className="noteText">"{account.reviewNote}"</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Immutable Audit Trail Card */}
          <div className="contentCard">
            <div className="cardHeader">
              <h2 className="cardTitle">Entity Audit Trail</h2>
              <span className="cardPill">Tamper-Proof</span>
            </div>

            {account.auditLogs && account.auditLogs.length > 0 ? (
              <div className="auditLogList">
                {account.auditLogs.map((log) => (
                  <div key={log.id} className="auditLogItem">
                    <div className="auditActionRow">
                      <span className="auditActionBadge">{log.action}</span>
                      <span className="auditTime">{formatDate(log.createdAt)}</span>
                    </div>

                    <div className="auditActorRow">
                      <strong>Actor:</strong> {log.actor}
                    </div>

                    {(log.metadata?.reason || log.metadata?.note) && (
                      <div className="auditActorRow">
                        <strong>Reason:</strong> {log.metadata.reason || log.metadata.note}
                      </div>
                    )}
                    {log.metadata?.previousStatus && log.metadata?.newStatus && (
                      <div className="auditActorRow">
                        <strong>Status:</strong> {String(log.metadata.previousStatus).toLowerCase().replace(/_/g, " ")} → {String(log.metadata.newStatus).toLowerCase().replace(/_/g, " ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="emptySubCard">
                <p className="emptySubText">No audit events recorded for this entity yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
