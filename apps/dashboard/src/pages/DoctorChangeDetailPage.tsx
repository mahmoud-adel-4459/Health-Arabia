import React, { useEffect, useState } from "react";
import type { DoctorChangeDetail } from "../types";
import {
  getDoctorChangeRequestDetail,
  approveDoctorChangeRequest,
  rejectDoctorChangeRequest,
} from "../api";
import { useRouter } from "../router";

interface Props {
  requestId: string;
  onActionComplete: (msg: string) => void;
}

export function DoctorChangeDetailPage({ requestId, onActionComplete }: Props) {
  const { navigate } = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DoctorChangeDetail | null>(null);

  // Decision Modal States
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDoctorChangeRequestDetail(requestId);
      setDetail(data);
    } catch (err: any) {
      console.error("Failed to load doctor change detail:", err);
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
      await approveDoctorChangeRequest(requestId);
      setIsApproving(false);
      onActionComplete("Doctor profile changes approved successfully and applied live.");
      navigate("/doctor-changes");
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
      await rejectDoctorChangeRequest(requestId, rejectionReason.trim());
      setIsRejecting(false);
      onActionComplete("Doctor profile change request was declined. Live profile remains unchanged.");
      navigate("/doctor-changes");
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
          onClick={() => navigate("/doctor-changes")}
          className="btnBackToQueue"
        >
          ← Back to Doctor Change Queue
        </button>
      </div>
    );
  }

  const {
    doctor,
    status,
    createdAt,
    reviewedAt,
    reviewer,
    rejectionReason: savedRejectionReason,
    comparisons,
    listComparisons,
  } = detail;

  const changedScalarCount = comparisons.filter((c) => c.hasChanged).length;
  const changedListCount = Object.values(listComparisons).filter((l) => l.hasChanged).length;
  const totalModifications = changedScalarCount + changedListCount;

  return (
    <div className="detailPageWrapper">
      {/* Top Breadcrumb Bar */}
      <div className="detailBreadcrumbRow">
        <button
          type="button"
          onClick={() => navigate("/doctor-changes")}
          className="btnBackToQueue"
        >
          ← Back to Doctor Change Queue
        </button>
        <span className="detailReqIdBadge">Request #{requestId.slice(0, 8)}</span>
      </div>

      {/* Main Header Card */}
      <div className="detailHeaderCard">
        <div className="headerIdentityCol">
          <div className="headerTitleRow">
            <h1 className="headerFullName">{doctor.fullName}</h1>
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
              <strong>Clinical Title:</strong> {doctor.jobTitle || "Medical Specialist"}
            </span>
            <span>•</span>
            <span>
              <strong>Doctor Contact:</strong> {doctor.email} ({doctor.mobileE164})
            </span>
            <span>•</span>
            <span>
              <strong>Submitted:</strong>{" "}
              {new Date(createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </span>
            <span>•</span>
            <span>
              <strong>Modifications:</strong> {totalModifications} fields/collections modified
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
              Decline Changes
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
              The doctor submitted the profile modifications shown below. Live doctor profile data visible to facilities will NOT be altered
              until you click <strong>Approve Changes</strong>. Rejecting will leave the approved live credentials intact.
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
              These changes were atomically merged into the live doctor record.
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

      {/* 1. Field-by-Field Scalar Diff Comparison Card */}
      <div className="detailSectionCard">
        <div className="sectionCardHeader">
          <h2 className="sectionCardTitle">Personal &amp; Professional Details Comparison</h2>
          <span className="sectionSubtitle">
            Compare each current approved value against the doctor&apos;s proposed update.
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
                          <img src={c.currentImageUrl} alt="Current" className="diffImageThumb" />
                          <span className="diffValText">Current Photo</span>
                        </div>
                      ) : (
                        <span className="diffValEmpty">None on file</span>
                      )
                    ) : c.type === "file" ? (
                      c.currentImageUrl ? (
                        <a
                          href={c.currentImageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="docFileLink"
                        >
                          📎 {c.currentFileName || "Download Current CV"}
                        </a>
                      ) : (
                        <span className="diffValEmpty">None on file</span>
                      )
                    ) : c.type === "boolean" ? (
                      <span className={c.currentValue ? "textSuccess" : "textMuted"}>
                        {c.currentValue ? "Yes (Available)" : "No (Unavailable)"}
                      </span>
                    ) : (
                      <span className="diffValText">{c.currentDisplay}</span>
                    )}
                  </td>

                  {/* Proposed Value */}
                  <td className={`diffValCell proposedValCol ${c.hasChanged ? "proposedValHighlight" : ""}`}>
                    {c.type === "image" ? (
                      c.proposedImageUrl ? (
                        <div className="diffImageThumbWrap">
                          <img src={c.proposedImageUrl} alt="Proposed" className="diffImageThumb" />
                          <span className="diffValText">New Photo</span>
                        </div>
                      ) : (
                        <span className="diffValEmpty">Removed</span>
                      )
                    ) : c.type === "file" ? (
                      c.proposedImageUrl ? (
                        <a
                          href={c.proposedImageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="docFileLink"
                        >
                          📎 {c.proposedFileName || "Download Proposed CV"}
                        </a>
                      ) : (
                        <span className="diffValEmpty">Removed</span>
                      )
                    ) : c.type === "boolean" ? (
                      <span className={c.proposedValue ? "textSuccess" : "textMuted"}>
                        {c.proposedValue ? "Yes (Available)" : "No (Unavailable)"}
                      </span>
                    ) : (
                      <span className="diffValText">{c.proposedDisplay}</span>
                    )}
                  </td>

                  {/* Changed Status Badge */}
                  <td style={{ textAlign: "center" }}>
                    {c.hasChanged ? (
                      <span className="badgeModified">MODIFIED</span>
                    ) : (
                      <span className="badgeSame">SAME</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Target GCC Destinations / Preferred Countries Diff */}
      <div className="detailSectionCard">
        <div className="sectionCardHeader">
          <h2 className="sectionCardTitle">Target GCC Practice Destinations</h2>
          <span className="sectionSubtitle">
            {listComparisons.preferredCountries.hasChanged ? (
              <span className="badgeModified">MODIFIED</span>
            ) : (
              <span className="badgeSame">SAME</span>
            )}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", padding: "16px 20px" }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "8px" }}>
              CURRENT APPROVED DESTINATIONS
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {listComparisons.preferredCountries.current.length > 0 ? (
                listComparisons.preferredCountries.current.map((c, i) => (
                  <span key={i} className="statusPill badgeDraft" style={{ fontSize: "13px" }}>
                    {c}
                  </span>
                ))
              ) : (
                <span className="diffValEmpty">No preferred countries recorded</span>
              )}
            </div>
          </div>
          <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: "24px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#0284c7", marginBottom: "8px" }}>
              PROPOSED TARGET DESTINATIONS
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {listComparisons.preferredCountries.proposed.length > 0 ? (
                listComparisons.preferredCountries.proposed.map((c, i) => (
                  <span
                    key={i}
                    className="statusPill badgeApproved"
                    style={{ fontSize: "13px", background: "#f0fdf4", color: "#166534" }}
                  >
                    {c}
                  </span>
                ))
              ) : (
                <span className="diffValEmpty">None specified</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Additional Clinical Specialties Diff */}
      <div className="detailSectionCard">
        <div className="sectionCardHeader">
          <h2 className="sectionCardTitle">Additional Clinical Specialties</h2>
          <span className="sectionSubtitle">
            {listComparisons.additionalSpecialties.hasChanged ? (
              <span className="badgeModified">MODIFIED</span>
            ) : (
              <span className="badgeSame">SAME</span>
            )}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", padding: "16px 20px" }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "8px" }}>
              CURRENT SPECIALTIES
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {listComparisons.additionalSpecialties.current.length > 0 ? (
                listComparisons.additionalSpecialties.current.map((s, i) => (
                  <span key={i} className="statusPill badgeDraft" style={{ fontSize: "13px" }}>
                    {s}
                  </span>
                ))
              ) : (
                <span className="diffValEmpty">None recorded</span>
              )}
            </div>
          </div>
          <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: "24px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#0284c7", marginBottom: "8px" }}>
              PROPOSED SPECIALTIES
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {listComparisons.additionalSpecialties.proposed.length > 0 ? (
                listComparisons.additionalSpecialties.proposed.map((s, i) => (
                  <span
                    key={i}
                    className="statusPill badgeApproved"
                    style={{ fontSize: "13px", background: "#f0fdf4", color: "#166534" }}
                  >
                    {s}
                  </span>
                ))
              ) : (
                <span className="diffValEmpty">None specified</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Academic Qualifications & Education Diff */}
      <div className="detailSectionCard">
        <div className="sectionCardHeader">
          <h2 className="sectionCardTitle">Education &amp; Academic Qualifications</h2>
          <span className="sectionSubtitle">
            {listComparisons.educations.hasChanged ? (
              <span className="badgeModified">MODIFIED</span>
            ) : (
              <span className="badgeSame">SAME</span>
            )}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", padding: "16px 20px" }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "12px" }}>
              CURRENT QUALIFICATIONS ({listComparisons.educations.current.length})
            </div>
            {listComparisons.educations.current.map((e, idx) => (
              <div
                key={idx}
                style={{
                  padding: "12px 16px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  marginBottom: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "14px" }}>{e.degree}</div>
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                  {e.institution} • Graduated {e.graduationYear || "—"}
                  {e.isPrimary && (
                    <span style={{ marginLeft: "8px", color: "#0284c7", fontWeight: 600, fontSize: "11px" }}>
                      [Primary Degree]
                    </span>
                  )}
                </div>
              </div>
            ))}
            {listComparisons.educations.current.length === 0 && (
              <span className="diffValEmpty">No education records</span>
            )}
          </div>
          <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: "24px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#0284c7", marginBottom: "12px" }}>
              PROPOSED QUALIFICATIONS ({listComparisons.educations.proposed.length})
            </div>
            {listComparisons.educations.proposed.map((e, idx) => (
              <div
                key={idx}
                style={{
                  padding: "12px 16px",
                  background: "#f0fdf4",
                  borderRadius: "8px",
                  marginBottom: "8px",
                  border: "1px solid #bbf7d0",
                }}
              >
                <div style={{ fontWeight: 600, color: "#166534", fontSize: "14px" }}>{e.degree}</div>
                <div style={{ fontSize: "13px", color: "#15803d", marginTop: "2px" }}>
                  {e.institution} • Graduated {e.graduationYear || "—"}
                  {e.isPrimary && (
                    <span style={{ marginLeft: "8px", color: "#0284c7", fontWeight: 600, fontSize: "11px" }}>
                      [Primary Degree]
                    </span>
                  )}
                </div>
              </div>
            ))}
            {listComparisons.educations.proposed.length === 0 && (
              <span className="diffValEmpty">None submitted</span>
            )}
          </div>
        </div>
      </div>

      {/* 5. Medical Licenses & Registrations Diff */}
      <div className="detailSectionCard">
        <div className="sectionCardHeader">
          <h2 className="sectionCardTitle">Medical Practice Licenses &amp; Certifications</h2>
          <span className="sectionSubtitle">
            {listComparisons.licenses.hasChanged ? (
              <span className="badgeModified">MODIFIED</span>
            ) : (
              <span className="badgeSame">SAME</span>
            )}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", padding: "16px 20px" }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "12px" }}>
              CURRENT LICENSES ({listComparisons.licenses.current.length})
            </div>
            {listComparisons.licenses.current.map((l, idx) => (
              <div
                key={idx}
                style={{
                  padding: "12px 16px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  marginBottom: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "14px" }}>{l.licenseType}</div>
                <div style={{ fontSize: "13px", color: "#475569", marginTop: "4px" }}>
                  <strong>Reg No:</strong> {l.registrationNumber} • <strong>Authority:</strong> {l.issuingAuthority}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                  Expires: {l.expiryDate ? new Date(l.expiryDate).toLocaleDateString() : "—"}
                </div>
              </div>
            ))}
            {listComparisons.licenses.current.length === 0 && (
              <span className="diffValEmpty">No licenses on file</span>
            )}
          </div>
          <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: "24px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#0284c7", marginBottom: "12px" }}>
              PROPOSED LICENSES ({listComparisons.licenses.proposed.length})
            </div>
            {listComparisons.licenses.proposed.map((l, idx) => (
              <div
                key={idx}
                style={{
                  padding: "12px 16px",
                  background: "#f0fdf4",
                  borderRadius: "8px",
                  marginBottom: "8px",
                  border: "1px solid #bbf7d0",
                }}
              >
                <div style={{ fontWeight: 600, color: "#166534", fontSize: "14px" }}>{l.licenseType}</div>
                <div style={{ fontSize: "13px", color: "#15803d", marginTop: "4px" }}>
                  <strong>Reg No:</strong> {l.registrationNumber} • <strong>Authority:</strong> {l.issuingAuthority}
                </div>
                <div style={{ fontSize: "12px", color: "#166534", marginTop: "2px" }}>
                  Expires: {l.expiryDate ? new Date(l.expiryDate).toLocaleDateString() : "—"}
                </div>
              </div>
            ))}
            {listComparisons.licenses.proposed.length === 0 && (
              <span className="diffValEmpty">None submitted</span>
            )}
          </div>
        </div>
      </div>

      {/* 6. Work Experience History Diff */}
      <div className="detailSectionCard">
        <div className="sectionCardHeader">
          <h2 className="sectionCardTitle">Work &amp; Clinical Experience</h2>
          <span className="sectionSubtitle">
            {listComparisons.experiences.hasChanged ? (
              <span className="badgeModified">MODIFIED</span>
            ) : (
              <span className="badgeSame">SAME</span>
            )}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", padding: "16px 20px" }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "12px" }}>
              CURRENT CLINICAL POSTINGS ({listComparisons.experiences.current.length})
            </div>
            {listComparisons.experiences.current.map((exp, idx) => (
              <div
                key={idx}
                style={{
                  padding: "12px 16px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  marginBottom: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "14px" }}>{exp.position}</div>
                <div style={{ fontSize: "13px", color: "#0284c7", fontWeight: 500 }}>{exp.organization}</div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                  {exp.startDate ? new Date(exp.startDate).getFullYear() : "—"} –{" "}
                  {exp.endDate ? new Date(exp.endDate).getFullYear() : "Present"}
                </div>
                {exp.responsibilities && (
                  <p style={{ fontSize: "12px", color: "#475569", marginTop: "6px", lineHeight: 1.5 }}>
                    {exp.responsibilities}
                  </p>
                )}
              </div>
            ))}
            {listComparisons.experiences.current.length === 0 && (
              <span className="diffValEmpty">No experience records</span>
            )}
          </div>
          <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: "24px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#0284c7", marginBottom: "12px" }}>
              PROPOSED CLINICAL POSTINGS ({listComparisons.experiences.proposed.length})
            </div>
            {listComparisons.experiences.proposed.map((exp, idx) => (
              <div
                key={idx}
                style={{
                  padding: "12px 16px",
                  background: "#f0fdf4",
                  borderRadius: "8px",
                  marginBottom: "8px",
                  border: "1px solid #bbf7d0",
                }}
              >
                <div style={{ fontWeight: 600, color: "#166534", fontSize: "14px" }}>{exp.position}</div>
                <div style={{ fontSize: "13px", color: "#15803d", fontWeight: 500 }}>{exp.organization}</div>
                <div style={{ fontSize: "12px", color: "#166534", marginTop: "2px" }}>
                  {exp.startDate ? new Date(exp.startDate).getFullYear() : "—"} –{" "}
                  {exp.endDate ? new Date(exp.endDate).getFullYear() : "Present"}
                </div>
                {exp.responsibilities && (
                  <p style={{ fontSize: "12px", color: "#14532d", marginTop: "6px", lineHeight: 1.5 }}>
                    {exp.responsibilities}
                  </p>
                )}
              </div>
            ))}
            {listComparisons.experiences.proposed.length === 0 && (
              <span className="diffValEmpty">None submitted</span>
            )}
          </div>
        </div>
      </div>

      {/* 7. Languages Diff */}
      <div className="detailSectionCard">
        <div className="sectionCardHeader">
          <h2 className="sectionCardTitle">Languages &amp; Proficiency</h2>
          <span className="sectionSubtitle">
            {listComparisons.languages.hasChanged ? (
              <span className="badgeModified">MODIFIED</span>
            ) : (
              <span className="badgeSame">SAME</span>
            )}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", padding: "16px 20px" }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "12px" }}>
              CURRENT LANGUAGES ({listComparisons.languages.current.length})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {listComparisons.languages.current.map((l, idx) => (
                <span key={idx} className="statusPill badgeDraft" style={{ fontSize: "13px" }}>
                  {l.language} ({l.proficiency})
                </span>
              ))}
              {listComparisons.languages.current.length === 0 && (
                <span className="diffValEmpty">None recorded</span>
              )}
            </div>
          </div>
          <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: "24px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#0284c7", marginBottom: "12px" }}>
              PROPOSED LANGUAGES ({listComparisons.languages.proposed.length})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {listComparisons.languages.proposed.map((l, idx) => (
                <span
                  key={idx}
                  className="statusPill badgeApproved"
                  style={{ fontSize: "13px", background: "#f0fdf4", color: "#166534" }}
                >
                  {l.language} ({l.proficiency})
                </span>
              ))}
              {listComparisons.languages.proposed.length === 0 && (
                <span className="diffValEmpty">None submitted</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      {isApproving && (
        <div className="modalBackdrop">
          <div className="modalCard" style={{ maxWidth: "520px" }}>
            <h2 className="modalTitle">Approve Doctor Profile Changes?</h2>
            <p className="modalDescription">
              Are you sure you want to approve the modifications for <strong>{doctor.fullName}</strong>?
              All proposed personal details, qualifications, licenses, experiences, languages, and CV assets will be
              atomically merged into the live profile and made active. An audit log will be recorded.
            </p>
            <div className="modalActionRow">
              <button
                type="button"
                onClick={() => setIsApproving(false)}
                className="btnCancel"
                disabled={actionSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                className="btnConfirmApprove"
                disabled={actionSubmitting}
              >
                {actionSubmitting ? "Approving..." : "Yes, Approve & Publish Live"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejecting && (
        <div className="modalBackdrop">
          <div className="modalCard" style={{ maxWidth: "540px" }}>
            <h2 className="modalTitle">Decline Doctor Profile Changes</h2>
            <p className="modalDescription">
              Decline the requested updates for <strong>{doctor.fullName}</strong>. The doctor&apos;s live approved profile
              will remain completely unchanged. A clear administrative explanation is required.
            </p>
            <form onSubmit={handleReject}>
              <div className="formGroup">
                <label className="formLabel">Reason for Rejection *</label>
                <textarea
                  className="formTextarea"
                  rows={4}
                  required
                  placeholder="Explain why these updates are declined (e.g. unverified license registration number, missing graduation proof)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
              <div className="modalActionRow">
                <button
                  type="button"
                  onClick={() => setIsRejecting(false)}
                  className="btnCancel"
                  disabled={actionSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btnConfirmReject"
                  disabled={actionSubmitting || !rejectionReason.trim()}
                >
                  {actionSubmitting ? "Declining..." : "Decline Change Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
