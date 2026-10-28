import React, { useEffect, useState } from "react";
import type { JobSubmissionDetail } from "../types";
import { getJobSubmissionDetail, approveJobSubmission, rejectJobSubmission } from "../api";
import { useRouter } from "../router";

interface JobDetailPageProps {
  jobId: string;
  onActionComplete: (message: string) => void;
}

export function JobDetailPage({ jobId, onActionComplete }: JobDetailPageProps) {
  const { navigate } = useRouter();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<JobSubmissionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Decision Modal States
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    getJobSubmissionDetail(jobId)
      .then((data) => {
        if (mounted) {
          setJob(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load job submission detail:", err);
        if (mounted) {
          setError(err.message || "Failed to load job submission detail.");
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [jobId]);

  const handleApprove = async () => {
    try {
      setProcessing(true);
      setActionError(null);

      await approveJobSubmission(jobId);
      setShowApproveConfirm(false);
      onActionComplete(`Job requisition '${job?.title}' has been successfully approved and published!`);

      // Reload job data
      const refreshed = await getJobSubmissionDetail(jobId);
      setJob(refreshed);
    } catch (err: any) {
      setActionError(err.message || "Failed to approve job requisition.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setActionError("Please provide a specific rejection reason for the healthcare facility.");
      return;
    }

    try {
      setProcessing(true);
      setActionError(null);

      await rejectJobSubmission(jobId, rejectionReason.trim());
      setShowRejectModal(false);
      onActionComplete(`Job requisition '${job?.title}' was rejected. Feedback recorded and sent to facility.`);

      // Reload job data
      const refreshed = await getJobSubmissionDetail(jobId);
      setJob(refreshed);
    } catch (err: any) {
      setActionError(err.message || "Failed to reject job requisition.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="tableLoadingState" style={{ minHeight: "400px" }}>
        <div className="spinnerRing" />
        <span>Loading job submission review...</span>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="tableEmptyState" style={{ padding: "80px 20px" }}>
        <h3 className="emptyStateTitle">Job Submission Not Found</h3>
        <p className="emptyStateSubtitle">{error || "The requested job requisition could not be located."}</p>
        <button
          type="button"
          className="reviewBtn"
          style={{ marginTop: "16px" }}
          onClick={() => navigate("/jobs")}
        >
          Back to Moderation Queue
        </button>
      </div>
    );
  }

  const isPending = job.status === "PENDING_REVIEW";
  const isPublished = job.status === "PUBLISHED";
  const isRejected = job.status === "REJECTED";

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const formattedSalary =
    job.salaryMin && job.salaryMax
      ? `${job.salaryCurrencyCode ?? "SAR"} ${Number(job.salaryMin).toLocaleString()}–${Number(job.salaryMax).toLocaleString()} / ${job.salaryPeriodName}`
      : "Competitive / Upon negotiation";

  return (
    <div className="reviewDetailPage">
      {/* Top Breadcrumb & Navigation */}
      <div className="detailTopBreadcrumb">
        <button type="button" className="breadcrumbBackLink" onClick={() => navigate("/jobs")}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Back to Job Moderation Queue</span>
        </button>
      </div>

      {/* Detail Header Banner */}
      <div className="detailHeaderCard">
        <div className="detailHeaderTopRow">
          <div className="detailHeaderIdentity">
            <div
              className="detailAvatarBox"
              style={{
                width: "54px",
                height: "54px",
                borderRadius: "10px",
                backgroundColor: "#e0f2fe",
                color: "#0369a1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "18px",
                position: "relative",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {job.facility.name.slice(0, 2).toUpperCase()}
              {job.facility.logoUrl && (
                <img
                  src={job.facility.logoUrl}
                  alt={job.facility.name}
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "13px", fontFamily: "monospace", color: "#0f766e", fontWeight: 700 }}>
                  REF: {job.referenceNumber}
                </span>
                {job.isUrgent && (
                  <span style={{ fontSize: "12px", backgroundColor: "#fff1f2", color: "#e11d48", padding: "2px 8px", borderRadius: "10px", fontWeight: 700 }}>
                    🔥 Urgent Hiring
                  </span>
                )}
                {isPending && <span className="statusBadge badgePending">Pending Platform Review</span>}
                {isPublished && <span className="statusBadge badgeApproved">Published Live</span>}
                {isRejected && <span className="statusBadge badgeRejected">Rejected</span>}
              </div>

              <h1 className="detailHeaderTitle" style={{ marginTop: "6px" }}>{job.title}</h1>
              <div className="detailHeaderMeta">
                <span>Associated Healthcare Facility: <strong>{job.facility.name}</strong></span>
                <span>•</span>
                <span>Recruiter: <strong>{job.facility.recruitmentOfficer.name}</strong></span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="decisionActionGroup">
            {isPending ? (
              <>
                <button
                  type="button"
                  className="approveDecisionBtn"
                  onClick={() => {
                    setActionError(null);
                    setShowApproveConfirm(true);
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Approve & Publish</span>
                </button>

                <button
                  type="button"
                  className="rejectDecisionBtn"
                  onClick={() => {
                    setActionError(null);
                    setRejectionReason("");
                    setShowRejectModal(true);
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <span>Reject Submission</span>
                </button>
              </>
            ) : isPublished ? (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "13px", color: "#047857", fontWeight: 600 }}>
                  ✓ Published to directory on {formatDate(job.publishedAt)}
                </span>
                <a
                  href={`http://localhost:3000/jobs/${job.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="reviewBtn"
                  style={{ textDecoration: "none" }}
                >
                  View Public Page ↗
                </a>
              </div>
            ) : (
              <span style={{ fontSize: "13px", color: "#b91c1c", fontWeight: 600 }}>
                ✕ Rejected on {formatDate(job.reviewedAt)}
              </span>
            )}
          </div>
        </div>

        {/* Rejection Note Warning Banner */}
        {isRejected && job.reviewNote && (
          <div
            style={{
              marginTop: "20px",
              padding: "16px 20px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "10px",
              color: "#991b1b",
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            <strong>Rejection Reason Provided:</strong>
            <p style={{ marginTop: "4px" }}>{job.reviewNote}</p>
            {job.reviewer && (
              <span style={{ fontSize: "12px", color: "#b91c1c", display: "block", marginTop: "6px" }}>
                Decided by {job.reviewer.name} on {formatDate(job.reviewedAt)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Review Grid */}
      <div className="jobDetailGrid">
        {/* Left Column: Job Details & Figma 421:6082 Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Card: Key Job Requisition Parameters */}
          <div className="sectionCard">
            <h2 className="sectionCardTitle">Job Requisition Overview</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginTop: "14px" }}>
              <div className="fieldItem">
                <span className="fieldLabel">Specialty</span>
                <span className="fieldValue" style={{ fontWeight: 700, color: "var(--navy)" }}>
                  {job.specialty.nameEn}
                </span>
              </div>

              <div className="fieldItem">
                <span className="fieldLabel">Positions</span>
                <span className="fieldValue">
                  {job.positions} Clinical Position{job.positions > 1 ? "s" : ""}
                </span>
              </div>

              <div className="fieldItem">
                <span className="fieldLabel">Location (Destination)</span>
                <span className="fieldValue">
                  📍 {job.location.cityName}, {job.location.countryName}
                </span>
              </div>

              <div className="fieldItem">
                <span className="fieldLabel">Employment Term</span>
                <span className="fieldValue" style={{ color: "#0d9488", fontWeight: 700 }}>
                  {job.employmentType.nameEn}
                </span>
              </div>

              <div className="fieldItem">
                <span className="fieldLabel">Experience Requirement</span>
                <span className="fieldValue">
                  {job.minYearsExperience !== null ? `${job.minYearsExperience}+ Years` : "Not specified"}
                </span>
              </div>

              <div className="fieldItem">
                <span className="fieldLabel">Compensation Package</span>
                <span className="fieldValue" style={{ fontWeight: 700, color: "#059669" }}>
                  {formattedSalary}
                </span>
              </div>
            </div>
          </div>

          {/* Card: About the Hospital (Figma 440:3528 & 421:6082) */}
          <div className="sectionCard">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <h2 className="sectionCardTitle" style={{ margin: 0 }}>About the Hospital (Public Overview)</h2>
              <span style={{ fontSize: "12px", color: "#64748b" }}>Must be anonymous on public listing</span>
            </div>
            <p style={{ fontSize: "14px", color: "var(--text-main)", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
              {job.aboutHospital ||
                "This opportunity is with a premier accredited healthcare facility providing exceptional medical services across multiple specialties. The institution upholds world-class clinical standards and modern medical practices."}
            </p>
          </div>

          {/* Card: Job Description */}
          <div className="sectionCard">
            <h2 className="sectionCardTitle">Job Description</h2>
            <p style={{ fontSize: "14px", color: "var(--text-main)", lineHeight: "1.6", whiteSpace: "pre-wrap", marginTop: "10px" }}>
              {job.description}
            </p>
          </div>

          {/* Card: Key Responsibilities (Figma 421:6082 checklist) */}
          {job.responsibilities && job.responsibilities.length > 0 && (
            <div className="sectionCard">
              <h2 className="sectionCardTitle">Key Responsibilities ({job.responsibilities.length})</h2>
              <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 0 0", display: "flex", flexDirection: "column", gap: "10px" }}>
                {job.responsibilities.map((resp, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "14px", color: "var(--text-main)" }}>
                    <span style={{ color: "#059669", fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Card: Requirements (Figma 421:6082 checklist) */}
          {job.requirements && job.requirements.length > 0 && (
            <div className="sectionCard">
              <h2 className="sectionCardTitle">Clinical Requirements & Qualifications ({job.requirements.length})</h2>
              <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 0 0", display: "flex", flexDirection: "column", gap: "10px" }}>
                {job.requirements.map((req, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "14px", color: "var(--text-main)" }}>
                    <span style={{ color: "#059669", fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Card: Benefits & Perks (Figma 421:6082 checklist) */}
          {job.benefits && job.benefits.length > 0 && (
            <div className="sectionCard">
              <h2 className="sectionCardTitle">Benefits & Perks ({job.benefits.length})</h2>
              <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 0 0", display: "flex", flexDirection: "column", gap: "10px" }}>
                {job.benefits.map((ben, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "14px", color: "var(--text-main)" }}>
                    <span style={{ color: "#059669", fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span>{ben}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Facility & Recruitment Officer Information (PLATFORM ADMIN VIEW) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Card: Submitting Healthcare Facility */}
          <div className="sectionCard" style={{ borderLeft: "4px solid #0284c7" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h2 className="sectionCardTitle" style={{ margin: 0, color: "#0369a1" }}>
                Healthcare Facility Profile
              </h2>
              <span className={`statusBadge ${job.facility.accountStatus === "APPROVED" ? "badgeApproved" : "badgePending"}`}>
                Account: {job.facility.accountStatus}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="fieldItem">
                <span className="fieldLabel">Official Facility Name</span>
                <span className="fieldValue" style={{ fontWeight: 700, fontSize: "16px", color: "var(--navy)" }}>
                  {job.facility.name}
                </span>
              </div>

              <div className="fieldItem">
                <span className="fieldLabel">Facility Type</span>
                <span className="fieldValue">{job.facility.type || "General Hospital"}</span>
              </div>

              <div className="fieldItem">
                <span className="fieldLabel">Registered Location</span>
                <span className="fieldValue">
                  {job.facility.cityName}, {job.facility.countryName}
                </span>
              </div>

              {job.facility.address && (
                <div className="fieldItem">
                  <span className="fieldLabel">Street Address</span>
                  <span className="fieldValue">{job.facility.address}</span>
                </div>
              )}

              {job.facility.employeeCount && (
                <div className="fieldItem">
                  <span className="fieldLabel">Employee Count</span>
                  <span className="fieldValue">{job.facility.employeeCount} Staff Members</span>
                </div>
              )}

              <div className="fieldItem">
                <span className="fieldLabel">Institutional Contact Email</span>
                <a
                  href={`mailto:${job.facility.recruitmentOfficer.hospitalEmail || job.facility.recruitmentOfficer.loginEmail}`}
                  style={{ color: "#0284c7", fontWeight: 600, fontSize: "14px" }}
                >
                  {job.facility.recruitmentOfficer.hospitalEmail || job.facility.recruitmentOfficer.loginEmail}
                </a>
              </div>
            </div>
          </div>

          {/* Card: Recruitment Officer Contact Details (from Facility Registration) */}
          <div className="sectionCard" style={{ borderLeft: "4px solid #059669" }}>
            <h2 className="sectionCardTitle" style={{ margin: "0 0 16px 0", color: "#047857" }}>
              Recruitment Officer (Direct Contact)
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="fieldItem">
                <span className="fieldLabel">Officer Full Name</span>
                <span className="fieldValue" style={{ fontWeight: 700, fontSize: "15px", color: "var(--navy)" }}>
                  {job.facility.recruitmentOfficer.name}
                </span>
              </div>

              <div className="fieldItem">
                <span className="fieldLabel">Facility Login Identifier</span>
                <span className="fieldValue" style={{ fontFamily: "monospace", fontSize: "13px" }}>
                  {job.facility.recruitmentOfficer.loginEmail}
                </span>
              </div>

              <div className="fieldItem">
                <span className="fieldLabel">Official Hospital Email</span>
                <a
                  href={`mailto:${job.facility.recruitmentOfficer.hospitalEmail || job.facility.recruitmentOfficer.loginEmail}`}
                  style={{ color: "#0284c7", fontWeight: 600, fontSize: "14px" }}
                >
                  {job.facility.recruitmentOfficer.hospitalEmail || "Same as login email"}
                </a>
              </div>

              <div className="fieldItem">
                <span className="fieldLabel">Direct Mobile / Telephone</span>
                {job.facility.recruitmentOfficer.fullPhone ? (
                  <a
                    href={`tel:${job.facility.recruitmentOfficer.fullPhone.replace(/\s+/g, "")}`}
                    style={{ color: "#059669", fontWeight: 700, fontSize: "14px" }}
                  >
                    📞 {job.facility.recruitmentOfficer.fullPhone}
                  </a>
                ) : (
                  <span className="fieldValue">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Card: Submission Timeline & Audit */}
          <div className="sectionCard">
            <h2 className="sectionCardTitle">Submission Timeline</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "var(--text-muted)" }}>Submitted For Review</span>
                <span style={{ fontWeight: 600 }}>{formatDate(job.submittedAt)}</span>
              </div>

              {job.reviewedAt && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Reviewed At</span>
                  <span style={{ fontWeight: 600 }}>{formatDate(job.reviewedAt)}</span>
                </div>
              )}

              {job.reviewer && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Platform Reviewer</span>
                  <span style={{ fontWeight: 600 }}>{job.reviewer.name}</span>
                </div>
              )}

              {job.publishedAt && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Published Live</span>
                  <span style={{ fontWeight: 600, color: "#059669" }}>{formatDate(job.publishedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog: Approve & Publish */}
      {showApproveConfirm && (
        <div className="modalBackdrop">
          <div className="modalCard" style={{ maxWidth: "520px" }}>
            <h3 className="modalTitle">Approve Job Requisition</h3>
            <p className="modalSubtitle" style={{ marginTop: "8px" }}>
              Are you sure you want to approve <strong>{job.title}</strong> for publication?
            </p>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "8px", lineHeight: "1.5" }}>
              Once approved, this job will immediately become active and visible in the public directory and doctor dashboard.
              Doctor-facing privacy will be enforced: the facility name and recruitment officer details remain strictly confidential.
            </p>

            {actionError && <div className="modalErrorMessage">{actionError}</div>}

            <div className="modalActionRow">
              <button
                type="button"
                className="modalCancelBtn"
                disabled={processing}
                onClick={() => setShowApproveConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="approveDecisionBtn"
                disabled={processing}
                onClick={handleApprove}
              >
                {processing ? "Publishing..." : "Confirm & Publish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="modalBackdrop">
          <div className="modalCard" style={{ maxWidth: "560px" }}>
            <h3 className="modalTitle">Reject Job Requisition</h3>
            <p className="modalSubtitle" style={{ marginTop: "8px" }}>
              Please provide clear and actionable feedback explaining why this requisition for <strong>{job.title}</strong> cannot be approved.
            </p>

            <div style={{ marginTop: "16px" }}>
              <label style={{ fontSize: "13px", fontWeight: 700, color: "var(--navy)", display: "block", marginBottom: "6px" }}>
                Rejection Reason & Required Modifications *
              </label>
              <textarea
                className="rejectionTextarea"
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Please clarify required subspecialty licensing (CCT or American Board), adjust salary currency, or outline clinical call rota duties..."
              />
            </div>

            {actionError && <div className="modalErrorMessage">{actionError}</div>}

            <div className="modalActionRow">
              <button
                type="button"
                className="modalCancelBtn"
                disabled={processing}
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rejectDecisionBtn"
                disabled={processing}
                onClick={handleReject}
              >
                {processing ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
