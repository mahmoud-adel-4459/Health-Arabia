import React, { useEffect, useState } from "react";
import type { FacilityChangeDetail, FieldComparison } from "../types";
import {
  getFacilityChangeRequestDetail,
  approveFacilityChangeRequest,
  rejectFacilityChangeRequest,
} from "../api";
import { useRouter } from "../router";

interface Props {
  requestId: string;
  onActionComplete: (msg: string) => void;
}

export function FacilityChangeDetailPage({ requestId, onActionComplete }: Props) {
  const { navigate } = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<FacilityChangeDetail | null>(null);

  // Decision Modal States
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getFacilityChangeRequestDetail(requestId);
      setDetail(data);
    } catch (err: any) {
      console.error("Failed to load facility change detail:", err);
      setError(err.message || "Failed to load change request details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [requestId]);

  const handleApprove = async () => {
    try {
      setActionSubmitting(true);
      await approveFacilityChangeRequest(requestId);
      setIsApproving(false);
      onActionComplete("Facility profile changes approved successfully and applied live.");
      navigate("/facility-changes");
    } catch (err: any) {
      alert(err.message || "Failed to approve change request.");
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      alert("A clear rejection reason is required.");
      return;
    }

    try {
      setActionSubmitting(true);
      await rejectFacilityChangeRequest(requestId, rejectionReason.trim());
      setIsRejecting(false);
      onActionComplete("Facility profile change request was rejected. Live record remains unchanged.");
      navigate("/facility-changes");
    } catch (err: any) {
      alert(err.message || "Failed to reject change request.");
    } finally {
      setActionSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="detailLoadingWrap">
        <div className="tableSpinner" />
        <p>Loading field-by-field profile comparison...</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="detailErrorWrap">
        <h2>Unable to load change request</h2>
        <p>{error || "Change request not found."}</p>
        <button
          type="button"
          onClick={() => navigate("/facility-changes")}
          className="btnBackToQueue"
        >
          ← Back to Change Queue
        </button>
      </div>
    );
  }

  const { facility, comparisons, status, rejectionReason: savedRejectionReason, createdAt, reviewedAt, reviewer } = detail;
  const changedComparisons = comparisons.filter((c) => c.hasChanged);

  return (
    <div className="accountDetailPage">
      {/* Top Breadcrumb Navigation */}
      <div className="detailBreadcrumbBar">
        <button
          type="button"
          onClick={() => navigate("/facility-changes")}
          className="btnBackToQueue"
        >
          ← Back to Facility Change Queue
        </button>
      </div>

      {/* Main Header Card */}
      <div className="detailHeaderCard">
        <div className="headerIdentityCol">
          <div className="headerTitleRow">
            <h1 className="headerFullName">{facility.name}</h1>
            <span
              className={`statusPill ${
                status === "APPROVED"
                  ? "badgeApproved"
                  : status === "REJECTED"
                  ? "badgeRejected"
                  : "badgePending"
              }`}
            >
              {status}
            </span>
          </div>

          <div className="headerMetaRow">
            <span>
              <strong>Officer:</strong> {facility.currentOfficerName} ({facility.officerEmail})
            </span>
            <span>•</span>
            <span>
              <strong>Submitted:</strong>{" "}
              {new Date(createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </span>
            <span>•</span>
            <span>
              <strong>Modifications:</strong> {changedComparisons.length} of {comparisons.length} fields modified
            </span>
          </div>
        </div>

        {/* Action Buttons if PENDING */}
        {status === "PENDING" && (
          <div className="headerActionBtnGroup">
            <button
              type="button"
              onClick={() => setIsRejecting(true)}
              className="btnReject"
            >
              Reject Request
            </button>
            <button
              type="button"
              onClick={() => setIsApproving(true)}
              className="btnApprove"
            >
              Approve Changes
            </button>
          </div>
        )}
      </div>

      {/* Status Notice Banner */}
      {status === "PENDING" ? (
        <div className="noticeBanner pendingBanner">
          <div className="noticeIcon">ℹ️</div>
          <div>
            <strong>Platform Administrator Review in Progress</strong>
            <p>
              The facility submitted the profile modifications shown below. Live facility directory data will NOT be altered
              until you click <strong>Approve Changes</strong>. Rejecting will leave the approved live profile intact.
            </p>
          </div>
        </div>
      ) : status === "APPROVED" ? (
        <div className="noticeBanner approvedBanner">
          <div className="noticeIcon">✓</div>
          <div>
            <strong>Changes Approved & Committed</strong>
            <p>
              Approved by {reviewer?.name || "Platform Admin"}{" "}
              {reviewedAt && `on ${new Date(reviewedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`}.
              These changes were atomically merged into the live facility record.
            </p>
          </div>
        </div>
      ) : (
        <div className="noticeBanner rejectedBanner">
          <div className="noticeIcon">✕</div>
          <div>
            <strong>Changes Declined by Platform Administration</strong>
            <p>
              Reviewed by {reviewer?.name || "Platform Admin"}{" "}
              {reviewedAt && `on ${new Date(reviewedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`}.
              The live approved profile remained completely unchanged.
            </p>
            {savedRejectionReason && (
              <div className="rejectionReasonCallout">
                <strong>Administrative Reason:</strong> {savedRejectionReason}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Field-by-Field Diff Comparison Card */}
      <div className="detailSectionCard">
        <div className="sectionCardHeader">
          <h2 className="sectionCardTitle">Field-by-Field Profile Comparison</h2>
          <span className="sectionSubtitle">
            Compare each current approved value against the facility&apos;s proposed update.
          </span>
        </div>

        <div className="tableResponsiveWrap">
          <table className="diffComparisonTable">
            <thead>
              <tr>
                <th style={{ width: "22%" }}>Profile Field</th>
                <th style={{ width: "35%" }}>Current Approved Value (Live)</th>
                <th style={{ width: "35%" }}>Proposed Value (Requested)</th>
                <th style={{ width: "8%", textAlign: "center" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((c) => (
                <tr key={c.key} className={c.hasChanged ? "diffRowChanged" : "diffRowUnchanged"}>
                  <td className="fieldLabelCell">
                    <strong>{c.label}</strong>
                    <div className="fieldKeyLabel">{c.key}</div>
                  </td>

                  {/* Current Approved Value */}
                  <td className="diffValCell currentValCol">
                    {c.type === "image" ? (
                      c.currentImageUrl ? (
                        <div className="diffImageThumbWrap">
                          <img
                            src={c.currentImageUrl}
                            alt="Current Logo"
                            className="diffLogoThumb"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                          <span className="diffImgCaption">Current Logo</span>
                        </div>
                      ) : (
                        <span className="diffEmptyVal">No logo set</span>
                      )
                    ) : (
                      <div className="diffValText">{c.currentDisplay || <span className="diffEmptyVal">Empty</span>}</div>
                    )}
                  </td>

                  {/* Proposed Value */}
                  <td className="diffValCell proposedValCol">
                    {c.type === "image" ? (
                      c.proposedImageUrl ? (
                        <div className="diffImageThumbWrap">
                          <img
                            src={c.proposedImageUrl}
                            alt="Proposed Logo"
                            className="diffLogoThumb"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                          <span className="diffImgCaption">Proposed Logo</span>
                        </div>
                      ) : (
                        <span className="diffEmptyVal">Logo removed</span>
                      )
                    ) : (
                      <div className={`diffValText ${c.hasChanged ? "proposedChangedText" : ""}`}>
                        {c.proposedDisplay || <span className="diffEmptyVal">Empty</span>}
                      </div>
                    )}
                  </td>

                  {/* Status Pill */}
                  <td style={{ textAlign: "center" }}>
                    {c.hasChanged ? (
                      <span className="pillModified">MODIFIED</span>
                    ) : (
                      <span className="pillSame">SAME</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve Confirmation Modal */}
      {isApproving && (
        <div className="modalBackdrop" role="dialog" aria-modal="true">
          <div className="modalCard">
            <h3 className="modalTitle">Approve Profile Changes</h3>
            <p className="modalBodyText">
              Are you sure you want to approve these changes for <strong>{facility.name}</strong>?
            </p>
            <p className="modalSubText">
              {changedComparisons.length} modified field(s) will be atomically committed to the live directory record and an
              audit log entry will be permanently recorded.
            </p>
            <div className="modalActionRow">
              <button
                type="button"
                disabled={actionSubmitting}
                onClick={() => setIsApproving(false)}
                className="btnModalCancel"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionSubmitting}
                onClick={handleApprove}
                className="btnApprove"
              >
                {actionSubmitting ? "Committing Changes..." : "Confirm & Apply Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {isRejecting && (
        <div className="modalBackdrop" role="dialog" aria-modal="true">
          <div className="modalCard">
            <h3 className="modalTitle" style={{ color: "#b91c1c" }}>
              Reject Profile Change Request
            </h3>
            <p className="modalBodyText">
              Provide a clear reason explaining why these updates cannot be accepted for <strong>{facility.name}</strong>.
              The facility will receive this explanation, and the live approved profile will remain unchanged.
            </p>
            <form onSubmit={handleReject}>
              <div className="formGroup" style={{ marginTop: "16px" }}>
                <label className="formLabel" htmlFor="rejectionReasonInput">
                  Rejection Reason (Mandatory):
                </label>
                <textarea
                  id="rejectionReasonInput"
                  rows={4}
                  required
                  placeholder="e.g. Official hospital registration proof required for name update; or invalid healthcare authority address."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="modalTextarea"
                />
              </div>
              <div className="modalActionRow">
                <button
                  type="button"
                  disabled={actionSubmitting}
                  onClick={() => setIsRejecting(false)}
                  className="btnModalCancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionSubmitting || !rejectionReason.trim()}
                  className="btnReject"
                >
                  {actionSubmitting ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
