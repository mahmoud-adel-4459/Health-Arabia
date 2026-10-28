"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Save2,
  Briefcase,
  Location,
  Moneys,
  ArrowRight,
  Eye,
  Notification as NotificationIcon,
  Messages1,
  TickCircle,
  CloseCircle,
  ShieldSecurity,
} from "iconsax-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SimpleAuthFooter } from "@/components/site/SimpleAuthFooter";
import { ThreePartyChatModal } from "@/components/chat/ThreePartyChatModal";
import styles from "@/components/portal/portal.module.css";

interface DoctorDashboardData {
  doctor: {
    id: string;
    fullName: string;
    jobTitle: string | null;
    yearsOfExperience: number | null;
    photoUrl: string | null;
  };
  stats: {
    savedJobs: number;
    applications: number;
  };
  applications: Array<{
    id: string;
    jobId: string;
    jobTitle: string;
    facilityName: string;
    location: string;
    appliedAt: string;
    status: string;
  }>;
  consentRequests: Array<{
    id: string;
    hireRequestItemId: string;
    applicationId: string;
    candidateCode: string;
    jobId: string;
    jobRef: string;
    jobTitle: string;
    location: string;
    hireRequestStatus: string;
    doctorConsentStatus: string;
    doctorConsentAt: string | null;
    doctorConsentRevokedAt: string | null;
    identityReleaseStatus: string;
    decidedAt: string | null;
    requestedAt: string;
    conversationId: string | null;
    conversationStatus: string | null;
  }>;
  recommendedOpportunities: Array<{
    id: string;
    ref: string;
    title: string;
    facilityName: string;
    description: string;
    location: string;
    salary: string;
    employmentType: string;
    isUrgent: boolean;
  }>;
  savedOpportunities: Array<{
    id: string;
    ref: string;
    title: string;
    facilityName: string;
    description: string;
    location: string;
    salary: string;
    employmentType: string;
    isUrgent: boolean;
  }>;
  accountStatus?: string;
  canAccessJobFeatures?: boolean;
  notifications: Array<{
    id: string;
    title: string;
    body: string;
    createdAt: string;
    readAt: string | null;
    type: string;
  }>;
}

export default function DoctorDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DoctorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<DoctorDashboardData["notifications"]>([]);
  const [activeChatConversationId, setActiveChatConversationId] = useState<string | null>(null);
  const [processingConsentId, setProcessingConsentId] = useState<string | null>(null);
  const [consentAlert, setConsentAlert] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);

        // Verify active session & role
        const sessionRes = await fetch("/api/auth/me", { credentials: "include" });
        if (!sessionRes.ok) {
          router.replace("/login/doctor");
          return;
        }
        const sessionData = await sessionRes.json();
        if (sessionData.user?.role !== "DOCTOR") {
          router.replace("/login/doctor");
          return;
        }

        // Fetch dashboard data
        const res = await fetch("/api/doctor/dashboard", { credentials: "include" });
        if (!res.ok) {
          throw new Error("Unable to load doctor dashboard.");
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

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const handleGrantConsent = async (releaseId: string) => {
    try {
      setProcessingConsentId(releaseId);
      const res = await fetch(`/api/doctor/consent/${releaseId}/grant`, {
        method: "POST",
        credentials: "include",
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.message || "Failed to grant consent.");
      setConsentAlert("Consent granted successfully! Platform administrators will review the release and unlock group coordination.");
      const dashRes = await fetch("/api/doctor/dashboard", { credentials: "include" });
      if (dashRes.ok) setData(await dashRes.json());
    } catch (err: any) {
      alert(err.message || "An error occurred.");
    } finally {
      setProcessingConsentId(null);
    }
  };

  const handleDeclineConsent = async (releaseId: string) => {
    if (!confirm("Are you sure you wish to decline this hiring inquiry? The inquiry will be closed.")) return;
    try {
      setProcessingConsentId(releaseId);
      const res = await fetch(`/api/doctor/consent/${releaseId}/decline`, {
        method: "POST",
        credentials: "include",
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.message || "Failed to decline consent.");
      setConsentAlert("You have declined this hiring inquiry.");
      const dashRes = await fetch("/api/doctor/dashboard", { credentials: "include" });
      if (dashRes.ok) setData(await dashRes.json());
    } catch (err: any) {
      alert(err.message || "An error occurred.");
    } finally {
      setProcessingConsentId(null);
    }
  };

  const handleRevokeConsent = async (releaseId: string) => {
    if (!confirm("Warning: Revoking consent will immediately terminate active coordination with the healthcare facility and make the conversation read-only. Do you wish to proceed?")) return;
    try {
      setProcessingConsentId(releaseId);
      const res = await fetch(`/api/doctor/consent/${releaseId}/revoke`, {
        method: "POST",
        credentials: "include",
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.message || "Failed to revoke consent.");
      setConsentAlert("Identity release consent has been revoked. Conversation is now read-only and facility access to your profile has been terminated.");
      const dashRes = await fetch("/api/doctor/dashboard", { credentials: "include" });
      if (dashRes.ok) setData(await dashRes.json());
    } catch (err: any) {
      alert(err.message || "An error occurred.");
    } finally {
      setProcessingConsentId(null);
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

  const getStatusClass = (status: string) => {
    switch (status.toUpperCase()) {
      case "UNDER_REVIEW":
        return styles.statusUnderReview;
      case "APPROVED":
      case "HIRED":
      case "COMPLETED":
        return styles.statusCompleted;
      case "REJECTED":
        return styles.statusRejected;
      case "SUBMITTED":
      case "APPLIED":
      default:
        return styles.statusApplied;
    }
  };

  const formatStatusLabel = (status: string) => {
    switch (status.toUpperCase()) {
      case "UNDER_REVIEW":
        return "Under Review";
      case "SUBMITTED":
        return "Applied";
      default:
        return status.replace(/_/g, " ").toLowerCase();
    }
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
      <SiteHeader content={headerContent} activeHref="/dashboard/doctor" />

      <main className={styles.portalMain}>
        {loading ? (
          <div className={styles.loadingStateWrap}>
            <div className={styles.spinner} />
            <p style={{ color: "#5b6e84", fontSize: "15px" }}>Loading your candidate dashboard...</p>
          </div>
        ) : error ? (
          <div className={styles.errorStateWrap}>
            <h2 style={{ color: "#0a2647", fontSize: "20px" }}>Unable to load dashboard</h2>
            <p style={{ color: "#5b6e84", fontSize: "14px" }}>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className={styles.btnSolidTeal}
              style={{ marginTop: "12px" }}
            >
              Try Again
            </button>
          </div>
        ) : data ? (
          <>
            {/* Welcome Banner matching Figma 430:3164 */}
            <div className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>Welcome, {data.doctor.fullName}</h1>
              <p className={styles.pageSubtitle}>
                Track your active applications, explore tailored matches, and manage your GCC credentials.
              </p>
            </div>

            {/* Profile Under Review Banner matching Figma Pop 473:2723 */}
            {data.canAccessJobFeatures === false && (
              <div
                style={{
                  background: "#e8f3f3",
                  border: "1px solid #1b8a8a",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  marginBottom: "24px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  color: "#0a2647",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 4px 0", color: "#1b8a8a" }}>
                    Your Profile Is Under Review
                  </h3>
                  <p style={{ fontSize: "13px", color: "#3b516c", margin: 0, lineHeight: 1.5 }}>
                    Your medical credentials and licensing documents are currently being verified by the platform administration team. Job applications, saved opportunities, and GCC credential matching will be enabled once your profile has been approved.
                  </p>
                </div>
              </div>
            )}

            {/* Main 2-Column Grid */}
            <div className={styles.dashboardGrid}>
              <div className={styles.mainColumn}>
                {/* Stat Cards (Saved Jobs & Applications) */}
                <div className={styles.statCardsGrid}>
                  <div className={styles.statCard}>
                    <div className={styles.statIconWrap}>
                      <Save2 size={24} color="currentColor" variant="Outline" />
                    </div>
                    <div className={styles.statInfo}>
                      <span className={styles.statLabel}>Saved Jobs</span>
                      <span className={styles.statValue}>{data.stats.savedJobs}</span>
                    </div>
                  </div>

                  <div className={styles.statCard}>
                    <div className={styles.statIconWrap}>
                      <Briefcase size={24} color="currentColor" variant="Outline" />
                    </div>
                    <div className={styles.statInfo}>
                      <span className={styles.statLabel}>Applications</span>
                      <span className={styles.statValue}>{data.stats.applications}</span>
                    </div>
                  </div>
                </div>

                {/* Consent Alert Banner */}
                {consentAlert && (
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
                      marginBottom: "24px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <TickCircle size={22} color="#1b8a8a" variant="Bold" />
                      <span>{consentAlert}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConsentAlert(null)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#5b6e84" }}
                    >
                      <CloseCircle size={20} color="currentColor" />
                    </button>
                  </div>
                )}

                {/* Hiring Inquiries & Consent Decisions Section */}
                {data.consentRequests && data.consentRequests.length > 0 && (
                  <div style={{ marginBottom: "32px" }}>
                    <div className={styles.sectionHeader}>
                      <h2 className={styles.sectionTitle}>
                        Hiring Inquiries & Identity Consent ({data.consentRequests.length})
                      </h2>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {data.consentRequests.map((req) => {
                        const isPending = req.doctorConsentStatus === "PENDING";
                        const isGranted = req.doctorConsentStatus === "GRANTED";
                        const isRevoked = req.doctorConsentStatus === "REVOKED";
                        const isDeclined = req.doctorConsentStatus === "DECLINED";
                        const isApproved = req.identityReleaseStatus === "APPROVED";
                        const isBusy = processingConsentId === req.id;

                        return (
                          <div
                            key={req.id}
                            style={{
                              background: "#ffffff",
                              border: isApproved ? "1px solid #1b8a8a" : "1px solid #e2e8f0",
                              borderRadius: "16px",
                              padding: "24px",
                              boxShadow: "0 2px 8px rgba(10, 38, 71, 0.04)",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#1b8a8a", background: "#e8f3f3", padding: "2px 8px", borderRadius: "6px" }}>
                                    {req.jobRef}
                                  </span>
                                  <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0a2647" }}>
                                    {req.jobTitle}
                                  </h3>
                                </div>
                                <span style={{ fontSize: "13px", color: "#5b6e84" }}>
                                  Location: {req.location} • Application ID: {req.candidateCode}
                                </span>
                              </div>

                              <div>
                                {isPending && (
                                  <span style={{ fontSize: "12px", fontWeight: 700, backgroundColor: "#fef3c7", color: "#b45309", padding: "4px 12px", borderRadius: "12px" }}>
                                    ⏳ Consent Decision Required
                                  </span>
                                )}
                                {isGranted && !isApproved && (
                                  <span style={{ fontSize: "12px", fontWeight: 700, backgroundColor: "#eff6ff", color: "#1d4ed8", padding: "4px 12px", borderRadius: "12px" }}>
                                    ✓ Consent Granted • Awaiting Platform Review
                                  </span>
                                )}
                                {isApproved && !isRevoked && (
                                  <span style={{ fontSize: "12px", fontWeight: 700, backgroundColor: "#ecfdf5", color: "#047857", padding: "4px 12px", borderRadius: "12px" }}>
                                    ● Identity Released • Coordination Active
                                  </span>
                                )}
                                {isRevoked && (
                                  <span style={{ fontSize: "12px", fontWeight: 700, backgroundColor: "#fef2f2", color: "#b91c1c", padding: "4px 12px", borderRadius: "12px" }}>
                                    ✕ Consent Revoked (Read-Only)
                                  </span>
                                )}
                                {isDeclined && (
                                  <span style={{ fontSize: "12px", fontWeight: 700, backgroundColor: "#f1f5f9", color: "#64748b", padding: "4px 12px", borderRadius: "12px" }}>
                                    ✕ Consent Declined
                                  </span>
                                )}
                              </div>
                            </div>

                            <p style={{ fontSize: "14px", color: "#3b516c", margin: "14px 0", lineHeight: 1.5 }}>
                              {isPending
                                ? "A verified healthcare facility has reviewed your anonymous qualifications and requested to connect with you. Granting consent allows platform administrators to reveal your name, verified profile, and CV to the facility for direct coordination."
                                : isApproved
                                ? "Your identity and credentials have been securely released to the requesting healthcare facility. You may coordinate directly in the confidential 3-party group chat."
                                : isGranted
                                ? "You have granted consent for this opportunity. Our platform coordination team is conducting institutional verification before revealing your credentials."
                                : "This hiring inquiry is currently closed."}
                            </p>

                            {/* Actions */}
                            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginTop: "16px" }}>
                              {isPending && (
                                <>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleGrantConsent(req.id)}
                                    style={{
                                      padding: "10px 20px",
                                      borderRadius: "10px",
                                      background: "#1b8a8a",
                                      color: "#ffffff",
                                      border: "none",
                                      fontWeight: 700,
                                      fontSize: "14px",
                                      cursor: isBusy ? "not-allowed" : "pointer",
                                    }}
                                  >
                                    {isBusy ? "Processing..." : "Grant Consent"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleDeclineConsent(req.id)}
                                    style={{
                                      padding: "10px 18px",
                                      borderRadius: "10px",
                                      background: "#f1f5f9",
                                      color: "#64748b",
                                      border: "none",
                                      fontWeight: 600,
                                      fontSize: "14px",
                                      cursor: isBusy ? "not-allowed" : "pointer",
                                    }}
                                  >
                                    Decline Inquiry
                                  </button>
                                </>
                              )}

                              {isApproved && req.conversationId && (
                                <button
                                  type="button"
                                  onClick={() => setActiveChatConversationId(req.conversationId)}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "10px 20px",
                                    borderRadius: "10px",
                                    background: "#0a2647",
                                    color: "#ffffff",
                                    border: "none",
                                    fontWeight: 700,
                                    fontSize: "14px",
                                    cursor: "pointer",
                                  }}
                                >
                                  <Messages1 size={18} color="#ffffff" variant="Bold" />
                                  <span>{isRevoked ? "View Archived Chat" : "Open 3-Party Chat"}</span>
                                </button>
                              )}

                              {isApproved && !isRevoked && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleRevokeConsent(req.id)}
                                  style={{
                                    padding: "10px 16px",
                                    borderRadius: "10px",
                                    background: "none",
                                    color: "#be123c",
                                    border: "1px solid #fecaca",
                                    fontWeight: 600,
                                    fontSize: "13px",
                                    cursor: isBusy ? "not-allowed" : "pointer",
                                  }}
                                >
                                  Revoke Consent
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* My Applications Section */}
                <div>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>My Applications</h2>
                  </div>

                  {data.canAccessJobFeatures === false ? (
                    <div className={styles.emptyStateWrap}>
                      <p style={{ color: "#5b6e84", fontSize: "15px" }}>
                        Application tracking requires platform account approval.
                      </p>
                    </div>
                  ) : data.applications.length === 0 ? (
                    <div className={styles.emptyStateWrap}>
                      <p style={{ color: "#5b6e84", fontSize: "15px" }}>You have not submitted any applications yet.</p>
                      <Link href="/jobs" className={styles.btnSolidTeal} style={{ marginTop: "8px" }}>
                        Explore Open Jobs
                      </Link>
                    </div>
                  ) : (
                    <div className={styles.applicationList}>
                      {data.applications.map((app) => (
                        <div key={app.id} className={styles.applicationCard}>
                          <div className={styles.appCardInfo}>
                            <h3 className={styles.appJobTitle}>{app.jobTitle}</h3>
                            <div className={styles.appMetaRow}>
                              <span>{app.facilityName}</span>
                              <span className={styles.dotSeparator} />
                              <span>{app.location}</span>
                            </div>
                          </div>

                          <div className={styles.appCardRight}>
                            <span className={styles.appAppliedDate}>
                              Applied on {new Date(app.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                            <span className={`${styles.statusPill} ${getStatusClass(app.status)}`}>
                              {formatStatusLabel(app.status)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recommended Opportunities Section */}
                <div>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Recommended Opportunities</h2>
                    <Link href="/jobs" className={styles.sectionActionLink}>
                      Browse All →
                    </Link>
                  </div>

                  <div className={styles.jobCardsList}>
                    {data.recommendedOpportunities.map((job) => (
                      <div key={job.id} className={styles.jobCard}>
                        <div className={styles.jobCardTopRow}>
                          <span className={styles.jobRef}>{job.ref}</span>
                          <span className={styles.jobTypePill}>{job.employmentType}</span>
                        </div>

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
                          <Link href={`/jobs/${job.id}`} className={styles.jobActionLink}>
                            View details <ArrowRight size={16} color="currentColor" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Saved Opportunities Section */}
                {data.savedOpportunities.length > 0 && (
                  <div>
                    <div className={styles.sectionHeader}>
                      <h2 className={styles.sectionTitle}>
                        Saved Opportunities ({data.savedOpportunities.length})
                      </h2>
                    </div>

                    <div className={styles.jobCardsList}>
                      {data.savedOpportunities.map((job) => (
                        <div key={job.id} className={styles.jobCard}>
                          <div className={styles.jobCardTopRow}>
                            <span className={styles.jobRef}>{job.ref}</span>
                            <span className={styles.jobTypePill}>{job.employmentType}</span>
                          </div>

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
                            <div />
                            <Link href={`/jobs/${job.id}`} className={styles.jobActionLink}>
                              View details <ArrowRight size={16} color="currentColor" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar Column: Notifications Panel */}
              <div className={styles.sidebarColumn}>
                <div className={styles.panelCard}>
                  <div className={styles.panelHeader}>
                    <span className={styles.panelTitle}>Notifications</span>
                    {notifications.length > 0 && (
                      <button type="button" onClick={handleClearNotifications} className={styles.panelActionBtn}>
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
              </div>
            </div>
          </>
        ) : null}
      </main>

      {/* 3-Party Group Coordination Chat Modal */}
      {activeChatConversationId && (
        <ThreePartyChatModal
          conversationId={activeChatConversationId}
          currentUserRole="DOCTOR"
          onClose={() => setActiveChatConversationId(null)}
        />
      )}

      <SimpleAuthFooter />
    </div>
  );
}
