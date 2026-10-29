"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  People,
  Profile2User,
  Location,
  Moneys,
  ArrowRight,
  TickCircle,
  CloseCircle,
  Messages1,
  Eye,
  DocumentDownload,
} from "iconsax-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { defaultFooterContent } from "@/lib/home-content";
import { ThreePartyChatModal } from "@/components/chat/ThreePartyChatModal";
import styles from "@/components/portal/portal.module.css";

interface FacilityDashboardData {
  facility: {
    id: string;
    name: string;
    officerName: string;
    logoUrl: string | null;
  };
  stats: {
    activeJobs: number;
    totalApplicants: number;
    recentApplicants: number;
  };
  // Last 6 calendar months, oldest first. admitted = applications received that month;
  // completed = of those, applications with a final outcome (hired, not selected, withdrawn).
  analytics: Array<{
    month: string;
    label: string;
    year: number;
    admitted: number;
    completed: number;
  }>;
  lastAddedJobs: Array<{
    id: string;
    ref: string;
    title: string;
    status?: string;
    reviewNote?: string | null;
    submittedAt?: string | null;
    publishedAt?: string | null;
    facilityName: string;
    description: string;
    location: string;
    salary: string;
    employmentType: string;
    isUrgent: boolean;
    applicantsCount: number;
  }>;
  availableApplicants: Array<{
    applicationId: string;
    jobId: string;
    jobTitle: string;
    candidateCode: string;
    title: string;
    specialty: string;
    experienceText: string;
    status: string;
    submittedAt: string;
  }>;
  jobsWithApplicants: Array<{
    jobId: string;
    jobRef: string;
    jobTitle: string;
    totalApplicants: number;
    applicants: Array<{
      applicationId: string;
      candidateCode: string;
      jobTitle: string;
      specialty: string;
      yearsOfExperience: number;
      status: string;
      submittedAt: string;
      isIdentityReleased?: boolean;
      hireRequestStatus?: string | null;
      doctorConsentStatus?: string | null;
      identityReleaseStatus?: string | null;
      conversationId?: string | null;
      conversationStatus?: string | null;
    }>;
  }>;
  accountStatus?: string;
  canManageApplicants?: boolean;
  notifications: Array<{
    id: string;
    title: string;
    body: string;
    createdAt: string;
    readAt: string | null;
    type: string;
  }>;
}

export default function FacilityDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<FacilityDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Applicant Selection & Batch Hire Request
  const [selectedApplicantIds, setSelectedApplicantIds] = useState<string[]>([]);
  const [submittingHireRequest, setSubmittingHireRequest] = useState(false);
  const [hireRequestSuccess, setHireRequestSuccess] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<FacilityDashboardData["notifications"]>([]);
  const [activeChatConversationId, setActiveChatConversationId] = useState<string | null>(null);
  const [revealedCandidateModal, setRevealedCandidateModal] = useState<any | null>(null);
  const [loadingRevealedCandidate, setLoadingRevealedCandidate] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);

        // Verify active session & role
        const sessionRes = await fetch("/api/auth/me", { credentials: "include" });
        if (!sessionRes.ok) {
          router.replace("/login/facility?returnTo=/dashboard/facility");
          return;
        }
        const sessionData = await sessionRes.json();
        if (sessionData.user?.role !== "FACILITY") {
          router.replace("/login/facility?returnTo=/dashboard/facility");
          return;
        }

        const res = await fetch("/api/facility/dashboard", { credentials: "include" });
        if (!res.ok) {
          throw new Error("Unable to load facility dashboard.");
        }
        const json = await res.json();
        setData(json);
        setNotifications(json.notifications || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  const toggleSelectApplicant = (appId: string) => {
    setSelectedApplicantIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  };

  const handleSelectAll = () => {
    if (!data) return;
    if (selectedApplicantIds.length === data.availableApplicants.length) {
      setSelectedApplicantIds([]);
    } else {
      setSelectedApplicantIds(data.availableApplicants.map((a) => a.applicationId));
    }
  };

  const handleSubmitHireRequest = async (appIds: string[], jobId: string) => {
    if (!data || appIds.length === 0 || !jobId) return;
    try {
      setSubmittingHireRequest(true);

      const res = await fetch("/api/facility/hire-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          jobId,
          applicationIds: appIds,
          facilityNote: "Standard clinical hire request initiated via Facility Portal.",
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || "Failed to submit hire request.");
      }

      setHireRequestSuccess(
        `Hire request submitted successfully for ${appIds.length} candidate(s). Platform coordination team has been notified.`
      );
      setSelectedApplicantIds((prev) => prev.filter((id) => !appIds.includes(id)));

      // Refresh dashboard data
      const refreshRes = await fetch("/api/facility/dashboard", { credentials: "include" });
      if (refreshRes.ok) {
        const json = await refreshRes.json();
        setData(json);
      }
    } catch (err: any) {
      alert(err.message || "An error occurred while submitting the hire request.");
    } finally {
      setSubmittingHireRequest(false);
    }
  };

  const handleOpenRevealedCandidate = async (applicationId: string) => {
    try {
      setLoadingRevealedCandidate(true);
      const res = await fetch(`/api/facility/candidates/${applicationId}/revealed-profile`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Unable to load candidate details.");
      setRevealedCandidateModal(json.revealedProfile);
    } catch (err: any) {
      alert(err.message || "Failed to load candidate revealed profile.");
    } finally {
      setLoadingRevealedCandidate(false);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diffHours = Math.round((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return "Just now";
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) return "1 day ago";
    return `${diffDays} days ago`;
  };

  const headerContent = {
    nav: [
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
      { label: "Countries", href: "/countries", hasMenu: true },
      { label: "Hospitals", href: "/hospitals" },
      { label: "FAQ’s", href: "/faqs" },
      { label: "Contact Us", href: "/contact" },
    ],
    jobsLink: { label: "Available Jobs", href: "/jobs" },
    secondaryLink: null,
    joinMenu: {
      label: "Join Us",
      items: [
        { label: "Join as Healthcare Professional", href: "/login/doctor", icon: "doctor" as const },
        { label: "Join as Hospital / Clinic", href: "/login/facility", icon: "facility" as const },
      ],
    },
  };

  return (
    <div className={styles.portalContainer}>
      <SiteHeader content={headerContent} activeHref="/dashboard/facility" />

      <main className={styles.portalMain}>
        {loading ? (
          <div className={styles.loadingStateWrap}>
            <div className={styles.spinner} />
            <p style={{ color: "#5b6e84", fontSize: "15px" }}>Loading institutional dashboard...</p>
          </div>
        ) : error ? (
          <div className={styles.errorStateWrap}>
            <h2 style={{ color: "#0a2647", fontSize: "20px" }}>Unable to load dashboard</h2>
            <p style={{ color: "#5b6e84", fontSize: "14px" }}>{error}</p>
            <button onClick={() => window.location.reload()} className={styles.btnSolidTeal} style={{ marginTop: "12px" }}>
              Try Again
            </button>
          </div>
        ) : data ? (
          <>
            {/* Success Alert Banner for Hire Request */}
            {hireRequestSuccess && (
              <div
                style={{
                  background: "#e8f3f3",
                  border: "1px solid #1b8a8a",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: "#0a2647",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <TickCircle size={22} color="#1b8a8a" variant="Bold" />
                  <span>{hireRequestSuccess}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setHireRequestSuccess(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#5b6e84" }}
                >
                  <CloseCircle size={20} color="currentColor" />
                </button>
              </div>
            )}

            {/* Welcome Banner matching Figma 440:2294 */}
            <div className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>Welcome, {data.facility.name}</h1>
              <p className={styles.pageSubtitle}>
                Manage your healthcare hiring process and connect with qualified medical professionals.
              </p>
            </div>

            {/* 3 Stat Cards Across Top */}
            <div className={styles.statCardsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIconWrap}>
                  <Briefcase size={24} color="currentColor" variant="Outline" />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Active Jobs</span>
                  <span className={styles.statValue}>{data.stats.activeJobs}</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIconWrap}>
                  <People size={24} color="currentColor" variant="Outline" />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Total Applicants</span>
                  <span className={styles.statValue}>{data.stats.totalApplicants}</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIconWrap}>
                  <Profile2User size={24} color="currentColor" variant="Outline" />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Recent Applicants</span>
                  <span className={styles.statValue}>{data.stats.recentApplicants}</span>
                </div>
              </div>
            </div>

            {/* Main 2-Column Grid */}
            <div className={`${styles.dashboardGrid} ${styles.dashboardGridFacility}`}>
              {/* Left Column */}
              <div className={styles.mainColumn}>
                {/* JOB APPLICATIONS OVERVIEW Card */}
                <div className={styles.panelCard} style={{ padding: "28px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "8px" }}>
                    <div>
                      <h2 className={styles.panelTitle} style={{ fontSize: "16px" }}>
                        Job Applications Overview
                      </h2>
                      <p style={{ fontSize: "14px", color: "#8e9baa" }}>
                        Applications received per month
                        {data.analytics.length > 0
                          ? ` (${data.analytics[0].label} ${data.analytics[0].year} – ${
                              data.analytics[data.analytics.length - 1].label
                            } ${data.analytics[data.analytics.length - 1].year})`
                          : ""}
                      </p>
                    </div>

                    <div className={styles.chartLegend}>
                      <div>
                        <span className={styles.legendDotTeal} /> Admitted
                      </div>
                      <div>
                        <span className={styles.legendDotSlate} /> Completed
                      </div>
                    </div>
                  </div>

                  {/* Visual Bar Chart: real monthly counts, scaled to the largest month */}
                  {(() => {
                    const totalAdmitted = data.analytics.reduce((sum, m) => sum + m.admitted, 0);
                    if (totalAdmitted === 0) {
                      return (
                        <div
                          className={styles.barChartContainer}
                          style={{ alignItems: "center", justifyContent: "center" }}
                          role="status"
                        >
                          <p style={{ fontSize: "14px", color: "#8e9baa", textAlign: "center" }}>
                            {data.analytics.length === 0
                              ? "Application analytics are available once your facility account is approved."
                              : "No applications received in this period yet."}
                          </p>
                        </div>
                      );
                    }
                    const maxVal = Math.max(1, ...data.analytics.map((m) => Math.max(m.admitted, m.completed)));
                    const summary = data.analytics
                      .map((m) => `${m.label} ${m.year}: ${m.admitted} received, ${m.completed} completed`)
                      .join("; ");
                    return (
                      <div className={styles.barChartContainer} role="img" aria-label={`Applications per month. ${summary}`}>
                        {data.analytics.map((item) => {
                          const tealHeight = Math.round((item.admitted / maxVal) * 100);
                          const slateHeight = Math.round((item.completed / maxVal) * 100);
                          return (
                            <div key={item.month} className={styles.chartColumn}>
                              <div className={styles.barsGroup}>
                                <div
                                  className={styles.barTeal}
                                  style={{ height: `${tealHeight}%` }}
                                  title={`${item.label} ${item.year} · Admitted (received): ${item.admitted}`}
                                />
                                <div
                                  className={styles.barSlate}
                                  style={{ height: `${slateHeight}%` }}
                                  title={`${item.label} ${item.year} · Completed (final outcome): ${item.completed}`}
                                />
                              </div>
                              <span className={styles.chartDayLabel}>{item.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* LAST ADDED JOBS Section */}
                <div>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Last Added Jobs</h2>
                    <Link href="/jobs" className={styles.sectionActionLink}>
                      View all
                    </Link>
                  </div>

                  <div className={styles.jobCardsList}>
                    {data.lastAddedJobs.map((job) => (
                      <div key={job.id} className={styles.jobCard}>
                        <div className={styles.jobCardTopRow}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span className={styles.jobRef}>{job.ref}</span>
                            {job.status === "PENDING_REVIEW" && (
                              <span
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  backgroundColor: "#fef3c7",
                                  color: "#b45309",
                                  border: "1px solid #fde68a",
                                  borderRadius: "12px",
                                  padding: "2px 10px",
                                }}
                              >
                                ⏳ Pending Platform Review
                              </span>
                            )}
                            {job.status === "PUBLISHED" && (
                              <span
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  backgroundColor: "#ecfdf5",
                                  color: "#047857",
                                  border: "1px solid #a7f3d0",
                                  borderRadius: "12px",
                                  padding: "2px 10px",
                                }}
                              >
                                ✓ Published
                              </span>
                            )}
                            {job.status === "CHANGES_REQUESTED" && (
                              <span
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  backgroundColor: "#fff7ed",
                                  color: "#c2410c",
                                  border: "1px solid #fed7aa",
                                  borderRadius: "12px",
                                  padding: "2px 10px",
                                }}
                              >
                                ✎ Changes requested
                              </span>
                            )}
                            {job.status === "REJECTED" && (
                              <span
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  backgroundColor: "#fef2f2",
                                  color: "#b91c1c",
                                  border: "1px solid #fecaca",
                                  borderRadius: "12px",
                                  padding: "2px 10px",
                                }}
                              >
                                ✕ Rejected
                              </span>
                            )}
                          </div>
                          <span className={styles.jobTypePill}>{job.employmentType}</span>
                        </div>

                        {job.status === "CHANGES_REQUESTED" && job.reviewNote && (
                          <div
                            role="note"
                            style={{
                              marginTop: "8px",
                              padding: "8px 12px",
                              backgroundColor: "#fff7ed",
                              border: "1px solid #fed7aa",
                              borderRadius: "8px",
                              fontSize: "13px",
                              color: "#9a3412",
                            }}
                          >
                            <strong>The platform asked for changes:</strong> {job.reviewNote}
                          </div>
                        )}

                        {job.status === "REJECTED" && job.reviewNote && (
                          <div
                            style={{
                              marginTop: "8px",
                              padding: "8px 12px",
                              backgroundColor: "#fff1f2",
                              border: "1px solid #ffe4e6",
                              borderRadius: "8px",
                              fontSize: "13px",
                              color: "#be123c",
                            }}
                          >
                            <strong>Review Feedback:</strong> {job.reviewNote}
                          </div>
                        )}

                        <div className={styles.jobCardMain}>
                          <h3 className={styles.jobTitle}>{job.title}</h3>
                          <span className={styles.jobFacilityName}>{job.facilityName}</span>
                          <p className={styles.jobDescription}>{job.description}</p>
                        </div>

                        <div className={styles.jobMetaRow}>
                          <div className={styles.jobMetaItem}>
                            <Location size={18} color="#5b6e84" variant="Outline" />
                            <span>{job.location}</span>
                          </div>
                          <div className={styles.jobMetaItem}>
                            <Moneys size={18} color="#5b6e84" variant="Outline" />
                            <span>{job.salary}</span>
                          </div>
                        </div>

                        <div className={styles.jobCardFooter}>
                          {job.isUrgent ? (
                            <span className={styles.urgentBadge}>
                              <span>🔥</span> Urgently Hiring
                            </span>
                          ) : (
                            <div />
                          )}
                          {job.status === "PUBLISHED" ? (
                            <Link href={`/jobs/${job.id}`} className={styles.jobActionLink}>
                              View public details <ArrowRight size={16} color="currentColor" />
                            </Link>
                          ) : job.status === "CHANGES_REQUESTED" ? (
                            <Link href={`/dashboard/facility/jobs/${job.id}/edit`} className={styles.jobActionLink}>
                              Edit and resubmit <ArrowRight size={16} color="currentColor" />
                            </Link>
                          ) : (
                            <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>
                              {job.status === "PENDING_REVIEW" ? "Under platform review" : job.status === "REJECTED" ? "Submission rejected" : "Not published"}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className={styles.sidebarColumn}>
                {/* Notifications Panel */}
                <div className={styles.panelCard}>
                  <div className={styles.panelHeader}>
                    <span className={styles.panelTitle}>Notifications</span>
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setNotifications([])}
                        className={styles.panelActionBtn}
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <p style={{ color: "#8e9baa", fontSize: "14px", padding: "16px 0", textAlign: "center" }}>
                      No new notifications.
                    </p>
                  ) : (
                    <div className={styles.notificationList}>
                      {notifications.map((n) => (
                        <div key={n.id} className={styles.notificationItem}>
                          <div className={styles.notificationTop}>
                            {!n.readAt && <span className={styles.unreadDot} />}
                            <span className={styles.notificationText}>{n.title}</span>
                          </div>
                          <span className={styles.notificationTime}>{formatTimeAgo(n.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* AVAILABLE APPLICANTS Panel (Grouped Under Each Job Requisition) */}
                <div className={styles.panelCard} id="applicants">
                  <div className={styles.panelHeader}>
                    <span className={styles.panelTitle}>Available Applicants</span>
                    <span style={{ fontSize: "12px", color: "#8e9baa", fontWeight: 600 }}>
                      Grouped by Job Requisition
                    </span>
                  </div>

                  {/* Account Status Alert if not approved */}
                  {data.canManageApplicants === false && (
                    <div
                      style={{
                        background: "#fffbeb",
                        border: "1px solid #fde68a",
                        color: "#92400e",
                        borderRadius: "10px",
                        padding: "14px 16px",
                        fontSize: "13px",
                        marginBottom: "16px",
                        lineHeight: "1.5",
                      }}
                    >
                      <strong>Account Under Review:</strong> Your healthcare facility account is currently pending platform approval. Reviewing candidate applicants and submitting hire requests will be activated once institutional credentials are confirmed.
                    </div>
                  )}

                  {data.jobsWithApplicants && data.jobsWithApplicants.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      {data.jobsWithApplicants.map((jobGroup) => {
                        const jobAppIds = jobGroup.applicants.map((a) => a.applicationId);
                        const selectedInJob = selectedApplicantIds.filter((id) => jobAppIds.includes(id));
                        const allSelectedForJob = jobAppIds.length > 0 && selectedInJob.length === jobAppIds.length;

                        const handleSelectAllForJob = () => {
                          if (allSelectedForJob) {
                            setSelectedApplicantIds((prev) => prev.filter((id) => !jobAppIds.includes(id)));
                          } else {
                            setSelectedApplicantIds((prev) =>
                              Array.from(new Set([...prev.filter((id) => !jobAppIds.includes(id)), ...jobAppIds]))
                            );
                          }
                        };

                        return (
                          <div key={jobGroup.jobId} className={styles.applicantGroup}>
                            {/* Job Group Header: requisition, applicant count, Select All, selected count and Request Hire stay together */}
                            <div className={styles.applicantGroupHeader}>
                              <div className={styles.applicantGroupTitleBlock}>
                                <div className={styles.applicantGroupTitleRow}>
                                  <span className={styles.candidateCodeTag}>{jobGroup.jobRef}</span>
                                  <h3 className={styles.applicantGroupTitle}>{jobGroup.jobTitle}</h3>
                                </div>
                                <span className={styles.applicantMeta}>
                                  {jobGroup.totalApplicants} candidate{jobGroup.totalApplicants === 1 ? "" : "s"} applied
                                </span>
                              </div>

                              {/* Per-job Batch Action Bar */}
                              <div className={styles.applicantGroupActions}>
                                <label className={styles.selectAllLabel}>
                                  <input
                                    type="checkbox"
                                    className={styles.applicantCheckbox}
                                    checked={allSelectedForJob}
                                    onChange={handleSelectAllForJob}
                                    disabled={data.canManageApplicants === false}
                                  />
                                  <span>Select All ({jobGroup.applicants.length})</span>
                                </label>

                                <button
                                  type="button"
                                  className={styles.batchButton}
                                  disabled={
                                    selectedInJob.length === 0 ||
                                    submittingHireRequest ||
                                    data.canManageApplicants === false
                                  }
                                  onClick={() => handleSubmitHireRequest(selectedInJob, jobGroup.jobId)}
                                >
                                  Request Hire ({selectedInJob.length})
                                </button>
                              </div>
                            </div>

                            {/* Applicants under this specific job requisition */}
                            <div className={styles.applicantRowsList}>
                              {jobGroup.applicants.map((applicant) => {
                                const isSelected = selectedApplicantIds.includes(applicant.applicationId);
                                const isRequested = applicant.status === "HIRE_REQUESTED";
                                const releaseStatus = applicant.isIdentityReleased
                                  ? { label: "Identity released", tone: styles.releaseReleased }
                                  : isRequested
                                    ? applicant.doctorConsentStatus === "DECLINED"
                                      ? { label: "Declined by doctor", tone: styles.releaseDeclined }
                                      : { label: "Awaiting consent", tone: styles.releasePending }
                                    : { label: "Not requested", tone: styles.releaseNone };

                                return (
                                  <div
                                    key={applicant.applicationId}
                                    className={`${styles.applicantCardRow} ${isSelected ? styles.applicantCardRowSelected : ""}`}
                                  >
                                    <div className={styles.applicantRowLeft}>
                                      <input
                                        type="checkbox"
                                        className={styles.applicantCheckbox}
                                        checked={isSelected}
                                        onChange={() => toggleSelectApplicant(applicant.applicationId)}
                                        disabled={data.canManageApplicants === false}
                                        aria-label={`Select ${applicant.candidateCode}`}
                                      />
                                      <div className={styles.applicantInfo}>
                                        <h4 className={styles.applicantJobTitle}>{applicant.jobTitle}</h4>
                                        <span className={styles.applicantMeta}>
                                          {applicant.specialty} • {applicant.yearsOfExperience} yrs
                                        </span>
                                        <div className={styles.applicantTagRow}>
                                          <span className={styles.candidateCodeTag}>ID: {applicant.candidateCode}</span>
                                          <span className={`${styles.releaseStatus} ${releaseStatus.tone}`}>{releaseStatus.label}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className={styles.applicantActions}>
                                      {applicant.isIdentityReleased ? (
                                        <>
                                          <button
                                            type="button"
                                            className={styles.hireRequestBtn}
                                            onClick={() => handleOpenRevealedCandidate(applicant.applicationId)}
                                            disabled={loadingRevealedCandidate}
                                          >
                                            View Details & CV
                                          </button>
                                          {applicant.conversationId && (
                                            <button
                                              type="button"
                                              className={`${styles.hireRequestBtn} ${styles.chatBtn}`}
                                              onClick={() => setActiveChatConversationId(applicant.conversationId || null)}
                                            >
                                              Chat
                                            </button>
                                          )}
                                        </>
                                      ) : !isRequested ? (
                                        <button
                                          type="button"
                                          className={styles.hireRequestBtn}
                                          disabled={submittingHireRequest || data.canManageApplicants === false}
                                          onClick={() => handleSubmitHireRequest([applicant.applicationId], jobGroup.jobId)}
                                        >
                                          Request to hire
                                        </button>
                                      ) : null}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ color: "#8e9baa", fontSize: "14px", padding: "24px 0", textAlign: "center" }}>
                      No candidate applicants currently awaiting review for your active job postings.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </main>

      {/* Revealed Candidate Profile Modal */}
      {revealedCandidateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            backgroundColor: "rgba(10, 38, 71, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setRevealedCandidateModal(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "700px",
              maxHeight: "85vh",
              overflowY: "auto",
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              padding: "32px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#1b8a8a", background: "#e8f3f3", padding: "2px 8px", borderRadius: "6px" }}>
                  Candidate ID: {revealedCandidateModal.candidateCode}
                </span>
                <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#0a2647", margin: "6px 0 0" }}>
                  {revealedCandidateModal.fullName}
                </h2>
                <span style={{ fontSize: "14px", color: "#5b6e84" }}>
                  {revealedCandidateModal.currentJobTitle} • {revealedCandidateModal.yearsOfExperience} years experience
                </span>
              </div>
              <button
                type="button"
                onClick={() => setRevealedCandidateModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <CloseCircle size={26} color="currentColor" />
              </button>
            </div>

            {/* Contact Details */}
            <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0a2647", marginBottom: "10px" }}>
                Contact Information
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                <div>
                  <span style={{ color: "#5b6e84" }}>Email: </span>
                  <strong style={{ color: "#0a2647" }}>{revealedCandidateModal.email || "N/A"}</strong>
                </div>
                <div>
                  <span style={{ color: "#5b6e84" }}>Phone: </span>
                  <strong style={{ color: "#0a2647" }}>{revealedCandidateModal.phone || "N/A"}</strong>
                </div>
                <div>
                  <span style={{ color: "#5b6e84" }}>Nationality: </span>
                  <strong style={{ color: "#0a2647" }}>{revealedCandidateModal.nationality || "N/A"}</strong>
                </div>
                <div>
                  <span style={{ color: "#5b6e84" }}>Location: </span>
                  <strong style={{ color: "#0a2647" }}>{revealedCandidateModal.currentLocation || "N/A"}</strong>
                </div>
              </div>
            </div>

            {/* CV Download Button */}
            {revealedCandidateModal.cv && (
              <div style={{ marginBottom: "20px" }}>
                <a
                  href={revealedCandidateModal.cv.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "12px 20px",
                    borderRadius: "10px",
                    backgroundColor: "#1b8a8a",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "14px",
                    textDecoration: "none",
                  }}
                >
                  <DocumentDownload size={20} color="#ffffff" />
                  <span>Download Verified CV ({revealedCandidateModal.cv.originalName})</span>
                </a>
              </div>
            )}

            {/* Experiences */}
            {revealedCandidateModal.experiences && revealedCandidateModal.experiences.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0a2647", marginBottom: "8px" }}>
                  Clinical Experience
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {revealedCandidateModal.experiences.map((exp: any, idx: number) => (
                    <div key={idx} style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: "8px", fontSize: "13px" }}>
                      <strong style={{ color: "#0a2647" }}>{exp.position}</strong> at {exp.organization}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Licenses */}
            {revealedCandidateModal.licenses && revealedCandidateModal.licenses.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0a2647", marginBottom: "8px" }}>
                  Licenses & Accreditations
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {revealedCandidateModal.licenses.map((lic: any, idx: number) => (
                    <div key={idx} style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: "8px", fontSize: "13px" }}>
                      <strong style={{ color: "#0a2647" }}>{lic.licenseType}</strong> ({lic.issuingAuthority}) • Reg: {lic.registrationNumber}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Launch chat action */}
            {revealedCandidateModal.conversationId && (
              <div style={{ paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
                <button
                  type="button"
                  onClick={() => {
                    const cid = revealedCandidateModal.conversationId;
                    setRevealedCandidateModal(null);
                    setActiveChatConversationId(cid);
                  }}
                  style={{
                    padding: "12px 24px",
                    borderRadius: "10px",
                    backgroundColor: "#0a2647",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Messages1 size={18} color="#ffffff" />
                  <span>Open 3-Party Coordination Chat</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3-Party Chat Modal */}
      {activeChatConversationId && (
        <ThreePartyChatModal
          conversationId={activeChatConversationId}
          currentUserRole="FACILITY"
          onClose={() => setActiveChatConversationId(null)}
        />
      )}

      <SiteFooter content={defaultFooterContent} />
    </div>
  );
}
