import React, { useState } from "react";
import type { AdminUser } from "../types";
import { useRouter } from "../router";

interface AdminShellProps {
  user: AdminUser;
  pendingCount?: number;
  pendingChangesCount?: number;
  pendingDoctorChangesCount?: number;
  pendingJobsCount?: number;
  pendingHiresCount?: number;
  onLogout: () => void;
  children: React.ReactNode;
}

export function AdminShell({
  user,
  pendingCount = 0,
  pendingChangesCount = 0,
  pendingDoctorChangesCount = 0,
  pendingJobsCount = 0,
  pendingHiresCount = 0,
  onLogout,
  children,
}: AdminShellProps) {
  const { path, search, navigate } = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAccountsActive = path === "/accounts" || path === "/accounts/:id";
  const isChangesActive = path === "/facility-changes" || path === "/facility-changes/:id";
  const isDoctorChangesActive = path === "/doctor-changes" || path === "/doctor-changes/:id";
  const isJobsActive = path === "/jobs" || path === "/jobs/:id";
  const isHiresActive = path === "/hire-requests";

  const handleNavClick = (to: string) => {
    navigate(to);
    setMobileMenuOpen(false);
  };

  return (
    <div className="adminShell">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="mobileDrawerBackdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Persistent Sidebar */}
      <aside className={`adminSidebar ${mobileMenuOpen ? "sidebarOpen" : ""}`}>
        {/* Sidebar Brand Header */}
        <div className="sidebarBrand">
          <div className="sidebarLogoContainer" onClick={() => handleNavClick("/accounts")}>
            <img
              src="/brand/health-arabia-logo.png"
              alt="Health Arabia"
              className="sidebarLogoImg"
            />
          </div>
          <button
            type="button"
            className="mobileCloseSidebarBtn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close sidebar navigation"
          >
            ×
          </button>
        </div>

        <div className="sidebarBadgeSection">
          <span className="adminPortalPill">Platform Administration</span>
        </div>

        {/* Navigation Sections */}
        <nav className="sidebarNav" aria-label="Admin Navigation">
          <div className="navSectionHeader">Account Verification</div>

          <button
            type="button"
            className={`navItem ${isAccountsActive && !search ? "navItemActive" : ""}`}
            onClick={() => handleNavClick("/accounts")}
          >
            <svg
              className="navIcon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <polyline points="16 11 18 13 22 9" />
            </svg>
            <span className="navItemLabel">Review Queue</span>
            {pendingCount > 0 && <span className="navCounterBadge">{pendingCount}</span>}
          </button>

          <div className="navSubSection">
            <button
              type="button"
              className={`navSubItem ${isAccountsActive && search.includes("status=PENDING_REVIEW") ? "navSubItemActive" : ""}`}
              onClick={() => handleNavClick("/accounts?status=PENDING_REVIEW")}
            >
              <span className="subItemDot pendingDot" />
              <span>Pending Decisions</span>
            </button>

            <button
              type="button"
              className={`navSubItem ${isAccountsActive && search.includes("role=DOCTOR") ? "navSubItemActive" : ""}`}
              onClick={() => handleNavClick("/accounts?role=DOCTOR")}
            >
              <span className="subItemDot doctorDot" />
              <span>Doctor Profiles</span>
            </button>

            <button
              type="button"
              className={`navSubItem ${isAccountsActive && search.includes("role=FACILITY") ? "navSubItemActive" : ""}`}
              onClick={() => handleNavClick("/accounts?role=FACILITY")}
            >
              <span className="subItemDot facilityDot" />
              <span>Hospital & Clinics</span>
            </button>

            <button
              type="button"
              className={`navSubItem ${isAccountsActive && search.includes("status=APPROVED") ? "navSubItemActive" : ""}`}
              onClick={() => handleNavClick("/accounts?status=APPROVED")}
            >
              <span className="subItemDot approvedDot" />
              <span>Approved Archive</span>
            </button>

            <button
              type="button"
              className={`navSubItem ${isAccountsActive && search.includes("status=REJECTED") ? "navSubItemActive" : ""}`}
              onClick={() => handleNavClick("/accounts?status=REJECTED")}
            >
              <span className="subItemDot rejectedDot" />
              <span>Rejected Archive</span>
            </button>
          </div>

          <div className="navSectionHeader" style={{ marginTop: "24px" }}>Doctor Governance</div>

          <button
            type="button"
            className={`navItem ${isDoctorChangesActive && !search ? "navItemActive" : ""}`}
            onClick={() => handleNavClick("/doctor-changes")}
          >
            <svg
              className="navIcon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <polyline points="17 11 19 13 23 9" />
            </svg>
            <span className="navItemLabel">Doctor Profile Edits</span>
            {pendingDoctorChangesCount > 0 && <span className="navCounterBadge">{pendingDoctorChangesCount}</span>}
          </button>

          <div className="navSubSection">
            <button
              type="button"
              className={`navSubItem ${isDoctorChangesActive && search.includes("status=PENDING") ? "navSubItemActive" : ""}`}
              onClick={() => handleNavClick("/doctor-changes?status=PENDING")}
            >
              <span className="subItemDot pendingDot" />
              <span>Pending Review</span>
            </button>

            <button
              type="button"
              className={`navSubItem ${isDoctorChangesActive && search.includes("status=APPROVED") ? "navSubItemActive" : ""}`}
              onClick={() => handleNavClick("/doctor-changes?status=APPROVED")}
            >
              <span className="subItemDot approvedDot" />
              <span>Approved Changes</span>
            </button>

            <button
              type="button"
              className={`navSubItem ${isDoctorChangesActive && search.includes("status=REJECTED") ? "navSubItemActive" : ""}`}
              onClick={() => handleNavClick("/doctor-changes?status=REJECTED")}
            >
              <span className="subItemDot rejectedDot" />
              <span>Declined Changes</span>
            </button>
          </div>

          <div className="navSectionHeader" style={{ marginTop: "24px" }}>Facility Governance</div>

          <button
            type="button"
            className={`navItem ${isChangesActive && !search ? "navItemActive" : ""}`}
            onClick={() => handleNavClick("/facility-changes")}
          >
            <svg
              className="navIcon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span className="navItemLabel">Profile Changes</span>
            {pendingChangesCount > 0 && <span className="navCounterBadge">{pendingChangesCount}</span>}
          </button>

          <div className="navSubSection">
            <button
              type="button"
              className={`navSubItem ${isChangesActive && search.includes("status=PENDING") ? "navSubItemActive" : ""}`}
              onClick={() => handleNavClick("/facility-changes?status=PENDING")}
            >
              <span className="subItemDot pendingDot" />
              <span>Pending Review</span>
            </button>

            <button
              type="button"
              className={`navSubItem ${isChangesActive && search.includes("status=APPROVED") ? "navSubItemActive" : ""}`}
              onClick={() => handleNavClick("/facility-changes?status=APPROVED")}
            >
              <span className="subItemDot approvedDot" />
              <span>Approved Changes</span>
            </button>

            <button
              type="button"
              className={`navSubItem ${isChangesActive && search.includes("status=REJECTED") ? "navSubItemActive" : ""}`}
              onClick={() => handleNavClick("/facility-changes?status=REJECTED")}
            >
              <span className="subItemDot rejectedDot" />
              <span>Declined Changes</span>
            </button>
          </div>

          <div className="navSectionHeader" style={{ marginTop: "24px" }}>Job Moderation</div>

          <button
            type="button"
            className={`navItem ${isJobsActive && !search ? "navItemActive" : ""}`}
            onClick={() => handleNavClick("/jobs")}
          >
            <svg
              className="navIcon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            <span className="navItemLabel">Job Submissions</span>
            {pendingJobsCount > 0 && <span className="navCounterBadge">{pendingJobsCount}</span>}
          </button>

          <div className="navSubSection">
            <button
              type="button"
              className={`navSubItem ${isJobsActive && search.includes("status=PENDING_REVIEW") ? "navSubItemActive" : ""}`}
              onClick={() => handleNavClick("/jobs?status=PENDING_REVIEW")}
            >
              <span className="subItemDot pendingDot" />
              <span>Pending Review</span>
            </button>

            <button
              type="button"
              className={`navSubItem ${isJobsActive && search.includes("status=PUBLISHED") ? "navSubItemActive" : ""}`}
              onClick={() => handleNavClick("/jobs?status=PUBLISHED")}
            >
              <span className="subItemDot approvedDot" />
              <span>Published Jobs</span>
            </button>

            <button
              type="button"
              className={`navSubItem ${isJobsActive && search.includes("status=REJECTED") ? "navSubItemActive" : ""}`}
              onClick={() => handleNavClick("/jobs?status=REJECTED")}
            >
              <span className="subItemDot rejectedDot" />
              <span>Rejected Submissions</span>
            </button>
          </div>

          <div className="navSectionHeader" style={{ marginTop: "24px" }}>Placement & Releases</div>

          <button
            type="button"
            className={`navItem ${isHiresActive ? "navItemActive" : ""}`}
            onClick={() => handleNavClick("/hire-requests")}
          >
            <svg
              className="navIcon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="navItemLabel">Hire Requests</span>
            {pendingHiresCount > 0 && <span className="navCounterBadge">{pendingHiresCount}</span>}
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebarFooter">
          <div className="systemStatusPill">
            <span className="pulseGreenDot" />
            <span>API Server Connected</span>
          </div>

          <div className="sidebarUserCard">
            <div className="userAvatarCircle">
              {(user.displayName || user.email || "A").charAt(0).toUpperCase()}
            </div>
            <div className="sidebarUserMeta">
              <span className="sidebarUserName">{user.displayName || "Administrator"}</span>
              <span className="sidebarUserEmail" title={user.email || ""}>
                {user.email}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="sidebarSignOutBtn"
            onClick={onLogout}
            title="Sign out of administration session"
          >
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
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area with Top Bar */}
      <div className="adminMainArea">
        {/* Top Bar */}
        <header className="adminTopBar">
          <div className="topBarLeft">
            <button
              type="button"
              className="mobileMenuToggleBtn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Breadcrumb Navigation */}
            <nav className="topBreadcrumbs" aria-label="Breadcrumbs">
              <span
                className="breadcrumbItem breadcrumbLink"
                onClick={() => handleNavClick("/accounts")}
              >
                Platform Console
              </span>
              <span className="breadcrumbSeparator">/</span>
              {isAccountsActive && (
                <>
                  <span
                    className={`breadcrumbItem ${path === "/accounts" ? "breadcrumbActive" : "breadcrumbLink"}`}
                    onClick={() => handleNavClick("/accounts")}
                  >
                    Account Verification
                  </span>
                  {path === "/accounts/:id" && (
                    <>
                      <span className="breadcrumbSeparator">/</span>
                      <span className="breadcrumbItem breadcrumbActive">Account Inspection</span>
                    </>
                  )}
                </>
              )}
              {isChangesActive && (
                <>
                  <span
                    className={`breadcrumbItem ${path === "/facility-changes" ? "breadcrumbActive" : "breadcrumbLink"}`}
                    onClick={() => handleNavClick("/facility-changes")}
                  >
                    Facility Profile Changes
                  </span>
                  {path === "/facility-changes/:id" && (
                    <>
                      <span className="breadcrumbSeparator">/</span>
                      <span className="breadcrumbItem breadcrumbActive">Field Comparison Review</span>
                    </>
                  )}
                </>
              )}
              {isDoctorChangesActive && (
                <>
                  <span
                    className={`breadcrumbItem ${path === "/doctor-changes" ? "breadcrumbActive" : "breadcrumbLink"}`}
                    onClick={() => handleNavClick("/doctor-changes")}
                  >
                    Doctor Profile Changes
                  </span>
                  {path === "/doctor-changes/:id" && (
                    <>
                      <span className="breadcrumbSeparator">/</span>
                      <span className="breadcrumbItem breadcrumbActive">Doctor Profile Diff Review</span>
                    </>
                  )}
                </>
              )}
              {isJobsActive && (
                <>
                  <span
                    className={`breadcrumbItem ${path === "/jobs" ? "breadcrumbActive" : "breadcrumbLink"}`}
                    onClick={() => handleNavClick("/jobs")}
                  >
                    Job Moderation Queue
                  </span>
                  {path === "/jobs/:id" && (
                    <>
                      <span className="breadcrumbSeparator">/</span>
                      <span className="breadcrumbItem breadcrumbActive">Job Requisition Inspection</span>
                    </>
                  )}
                </>
              )}
            </nav>
          </div>

          <div className="topBarRight">
            <div className="topAdminIdentity">
              <span className="topAdminRole">PLATFORM_ADMIN</span>
              <span className="topAdminEmail">{user.email}</span>
            </div>

            <button
              type="button"
              className="topSignOutBtn"
              onClick={onLogout}
              title="Sign Out"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="topSignOutText">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Container */}
        <main className="adminPageContent">{children}</main>
      </div>
    </div>
  );
}
