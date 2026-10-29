import React, { useEffect, useState } from "react";
import type { AdminUser } from "../types";
import { useRouter } from "../router";

interface AdminShellProps {
  user: AdminUser;
  pendingCount?: number;
  pendingChangesCount?: number;
  pendingDoctorChangesCount?: number;
  pendingJobsCount?: number;
  pendingHiresCount?: number;
  newContactCount?: number;
  placementsReadyCount?: number;
  deletionOpenCount?: number;
  onLogout: () => void;
  children: React.ReactNode;
}

// Sidebar structure: a few clear groups. Each item is a real page; badges appear only where action is needed.
interface NavItem { to: string; label: string; icon: string; badge?: boolean }
interface NavGroup { title: string | null; items: NavItem[] }
const NAV_GROUPS: NavGroup[] = [
  { title: null, items: [{ to: "/overview", label: "Overview", icon: "M3 12l9-9 9 9M5 10v10h14V10" }] },
  {
    title: "Hiring",
    items: [
      { to: "/jobs", label: "Job approvals", icon: "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16", badge: true },
      { to: "/applications", label: "Doctor applications", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5", badge: true },
      { to: "/hire-requests", label: "Hire requests", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75", badge: true },
    ],
  },
  {
    title: "Accounts",
    items: [
      { to: "/accounts", label: "Account approvals", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17 11l2 2 4-4", badge: true },
      { to: "/doctor-changes", label: "Doctor profile edits", icon: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z", badge: true },
      { to: "/facility-changes", label: "Facility profile changes", icon: "M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6", badge: true },
      { to: "/deletion-requests", label: "Deletion requests", icon: "M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5", badge: true },
    ],
  },
  {
    title: "Website & platform",
    items: [
      { to: "/directory", label: "Hospitals directory", icon: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" },
      { to: "/countries", label: "Countries", icon: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" },
      { to: "/reference-data", label: "Site content & lists", icon: "M4 6h16M4 12h16M4 18h10" },
      { to: "/settings", label: "Site settings & SEO", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" },
      { to: "/contact-submissions", label: "Contact messages", icon: "M4 4h16v12H5.2L4 17.2zM8 9h8M8 12h5", badge: true },
      { to: "/audit", label: "Activity history", icon: "M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" },
    ],
  },
];
const NAV_TARGETS = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.to));

function resolveActiveNav(path: string, search: string): string | null {
  const basePath = path.replace(/\/:id$/, "");
  const current = new URLSearchParams(search);
  let best: string | null = null;
  let bestSpecificity = -1;
  for (const target of NAV_TARGETS) {
    const [targetPath, query = ""] = target.split("?");
    if (targetPath !== basePath) continue;
    const params = Array.from(new URLSearchParams(query).entries());
    if (!params.every(([key, value]) => current.get(key) === value)) continue;
    if (params.length > bestSpecificity) {
      best = target;
      bestSpecificity = params.length;
    }
  }
  return best;
}

export function AdminShell({
  user,
  pendingCount = 0,
  pendingChangesCount = 0,
  pendingDoctorChangesCount = 0,
  pendingJobsCount = 0,
  pendingHiresCount = 0,
  newContactCount = 0,
  placementsReadyCount = 0,
  deletionOpenCount = 0,
  onLogout,
  children,
}: AdminShellProps) {
  const { path, search, navigate } = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAccountsActive = path === "/accounts" || path === "/accounts/:id";
  const isChangesActive = path === "/facility-changes" || path === "/facility-changes/:id";
  const isDoctorChangesActive = path === "/doctor-changes" || path === "/doctor-changes/:id";
  const isJobsActive = path === "/jobs" || path === "/jobs/:id";
  const isHiresActive = path === "/hire-requests" || path === "/hire-requests/:id";
  const isApplicationsActive = path === "/applications" || path === "/applications/:id";
  const PLATFORM_TITLES: Record<string, string> = {
    "/overview": "Overview",
    "/directory": "Hospitals directory",
    "/reference-data": "Site content & lists",
    "/contact-submissions": "Contact messages",
    "/contact-submissions/:id": "Contact message",
    "/countries": "Countries",
    "/countries/new": "Add country",
    "/countries/:id": "Country",
    "/settings": "Site settings & SEO",
    "/deletion-requests": "Deletion requests",
    "/deletion-requests/:id": "Deletion request",
    "/audit": "Activity history",
  };
  const activeNav = resolveActiveNav(path, search);

  // Badge counts only where an administrator needs to act
  const badges: Record<string, number> = {
    "/jobs": pendingJobsCount,
    "/applications": placementsReadyCount,
    "/hire-requests": pendingHiresCount,
    "/accounts": pendingCount,
    "/doctor-changes": pendingDoctorChangesCount,
    "/facility-changes": pendingChangesCount,
    "/contact-submissions": newContactCount,
    "/deletion-requests": deletionOpenCount,
  };

  // Group open/closed state is remembered; the group holding the current page is always open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ha_admin_nav_groups") || "{}");
      return { Hiring: true, Accounts: true, "Website & platform": true, ...saved };
    } catch {
      return { Hiring: true, Accounts: true, "Website & platform": true };
    }
  });
  const toggleGroup = (title: string) =>
    setOpenGroups((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      try {
        localStorage.setItem("ha_admin_nav_groups", JSON.stringify(next));
      } catch {
        // storage unavailable: state still works for this session
      }
      return next;
    });
  useEffect(() => {
    const owner = NAV_GROUPS.find((g) => g.title && g.items.some((i) => i.to === activeNav));
    if (owner?.title && !openGroups[owner.title]) setOpenGroups((prev) => ({ ...prev, [owner.title!]: true }));
  }, [activeNav]);

  const renderItem = (item: NavItem) => (
    <button
      key={item.to}
      type="button"
      className={`navItem ${activeNav === item.to ? "navItemActive" : ""}`}
      aria-current={activeNav === item.to ? "page" : undefined}
      onClick={() => handleNavClick(item.to)}
    >
      <svg className="navIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={item.icon} />
      </svg>
      <span className="navItemLabel">{item.label}</span>
      {item.badge && (badges[item.to] ?? 0) > 0 && <span className="navCounterBadge">{badges[item.to]}</span>}
    </button>
  );

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
          {NAV_GROUPS.map((group) => {
            const badge = group.items.reduce((sum, item) => sum + (badges[item.to] ?? 0), 0);
            if (!group.title) {
              return group.items.map((item) => renderItem(item));
            }
            const isOpen = !!openGroups[group.title];
            const hasActive = group.items.some((item) => item.to === activeNav);
            return (
              <div className="navGroup" key={group.title}>
                <button
                  type="button"
                  className={`navGroupHeader ${hasActive ? "navGroupHeaderActive" : ""}`}
                  aria-expanded={isOpen}
                  aria-controls={`navgroup-${group.title}`}
                  onClick={() => toggleGroup(group.title!)}
                >
                  <span className="navGroupTitle">{group.title}</span>
                  {!isOpen && badge > 0 && <span className="navCounterBadge">{badge}</span>}
                  <svg className={`navGroupChevron ${isOpen ? "navGroupChevronOpen" : ""}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="navGroupBody" id={`navgroup-${group.title}`}>
                    {group.items.map((item) => renderItem(item))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
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
              {isHiresActive && (
                <>
                  <span
                    className={`breadcrumbItem ${path === "/hire-requests" ? "breadcrumbActive" : "breadcrumbLink"}`}
                    onClick={() => handleNavClick("/hire-requests")}
                  >
                    Hire requests
                  </span>
                  {path === "/hire-requests/:id" && (
                    <>
                      <span className="breadcrumbSeparator">/</span>
                      <span className="breadcrumbItem breadcrumbActive">Request details</span>
                    </>
                  )}
                </>
              )}
              {isApplicationsActive && (
                <>
                  <span
                    className={`breadcrumbItem ${path === "/applications" ? "breadcrumbActive" : "breadcrumbLink"}`}
                    onClick={() => handleNavClick("/applications")}
                  >
                    Doctor Applications
                  </span>
                  {path === "/applications/:id" && (
                    <>
                      <span className="breadcrumbSeparator">/</span>
                      <span className="breadcrumbItem breadcrumbActive">Application Detail</span>
                    </>
                  )}
                </>
              )}
              {PLATFORM_TITLES[path] && <span className="breadcrumbItem breadcrumbActive">{PLATFORM_TITLES[path]}</span>}
            </nav>
          </div>

          <div className="topBarRight">
            <div className="topAdminIdentity">
              <span className="topAdminEmail" title={user.email || undefined}>{user.email}</span>
              <span className="topAdminRole">Platform administrator</span>
            </div>

            <button
              type="button"
              className="topSignOutBtn"
              onClick={onLogout}
              aria-label="Log out"
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

        <footer className="adminFooter">
          <span>Copyright © 2026</span>{" "}
          <a href="https://www.qeematech.net/" target="_blank" rel="noopener noreferrer">QEEMATECH</a>{" "}
          <span>| All Rights Reserved</span>
        </footer>
      </div>
    </div>
  );
}
