"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowDown2,
  Buildings2,
  Element3,
  HambergerMenu,
  Health,
  Logout,
  Profile,
  SearchNormal1,
  Setting2,
  Trash,
} from "iconsax-react";
import Image from "next/image";
import Link from "next/link";
import type { HeaderContent, LinkItem } from "@/lib/home-content";
import styles from "./site.module.css";

interface AuthUser {
  id: string;
  email: string | null;
  mobileE164: string | null;
  displayName: string | null;
  role: "DOCTOR" | "FACILITY" | "PLATFORM_ADMIN";
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED" | "DRAFT" | "DEACTIVATED";
  isPendingReview: boolean;
  avatarUrl?: string | null;
}

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:5173";

function MaybeLink({ item, className }: { item: LinkItem; className?: string }) {
  if (!item.href) return <span className={className}>{item.label}</span>;
  return (
    <Link href={item.href} className={className}>
      {item.label}
    </Link>
  );
}

export function SiteHeader({
  content,
  activeHref,
}: {
  content: HeaderContent;
  activeHref: string;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check active session from /api/auth/me
  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (mounted && data?.user) {
          setUser(data.user);
        } else if (mounted) {
          setUser(null);
        }
      })
      .catch(() => {
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setLoadingSession(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // non-blocking
    }
    setUser(null);
    setDropdownOpen(false);
    window.location.href = "/";
  };

  const navLinks = (
    <>
      {content.nav.map((item) => (
        <Link
          key={item.label}
          href={item.href ?? "#"}
          className={`${styles.navLink} ${item.href === activeHref ? styles.navLinkActive : ""}`}
          aria-current={item.href === activeHref ? "page" : undefined}
        >
          {item.label}
          {item.hasMenu ? <ArrowDown2 size={16} color="currentColor" variant="Outline" /> : null}
        </Link>
      ))}
      <Link href={content.jobsLink.href ?? "#"} className={styles.navLink}>
        <SearchNormal1 size={16} color="currentColor" variant="Outline" />
        {content.jobsLink.label}
      </Link>
    </>
  );

  // Derive initials for avatar
  const getInitials = (name?: string | null) => {
    if (!name) return "HA";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <header className={styles.header}>
      <div className={`container ${styles.headerInner}`}>
        <Link href="/" className={styles.logo} aria-label={`${content.brand?.name ?? "Health Arabia"} home`}>
          <Image
            src={content.brand?.logoUrl ?? "/brand/health-arabia-logo.png"}
            alt={content.brand?.name ?? "Health Arabia"}
            width={272}
            height={48}
            priority
            unoptimized={!!content.brand?.logoUrl && !content.brand.logoUrl.startsWith("/")}
          />
        </Link>

        <nav className={styles.nav} aria-label="Main">
          {navLinks}
        </nav>

        <div className={styles.headerActions}>
          {content.secondaryLink ? (
            <MaybeLink item={content.secondaryLink} className={styles.secondaryLink} />
          ) : null}

          {/* Dynamic Authentication Header Section */}
          {loadingSession ? (
            // Reserved space during session verification to prevent layout flash
            <div className={styles.authPlaceholder} />
          ) : user ? (
            // Authenticated Account Dropdown matching Figma variants (428:2648 / 430:3873)
            <div className={styles.accountMenuWrapper} ref={dropdownRef}>
              <button
                type="button"
                className={styles.accountTrigger}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                aria-label={`Open account menu for ${user.displayName || "User"}`}
              >
                {user.role === "FACILITY" ? (
                  <div className={styles.facilityAvatarBox}>
                    {user.avatarUrl && !avatarFailed ? (
                      <img
                        src={user.avatarUrl}
                        alt=""
                        className={styles.doctorAvatarImg}
                        onError={() => setAvatarFailed(true)}
                      />
                    ) : (
                      <span>{getInitials(user.displayName)}</span>
                    )}
                  </div>
                ) : user.role === "PLATFORM_ADMIN" ? (
                  <div className={styles.adminAvatarBox}>
                    <span>PA</span>
                  </div>
                ) : (
                  <div className={styles.doctorAvatarBox}>
                    {user.avatarUrl && !avatarFailed ? (
                      <img
                        src={user.avatarUrl}
                        alt=""
                        className={styles.doctorAvatarImg}
                        onError={() => setAvatarFailed(true)}
                      />
                    ) : (
                      <span className={styles.doctorAvatarInitials}>{getInitials(user.displayName)}</span>
                    )}
                  </div>
                )}

                <span className={styles.accountUserName}>
                  {user.displayName || (user.role === "DOCTOR" ? "Dr. Candidate" : "Facility")}
                </span>

                <ArrowDown2
                  size={16}
                  color="currentColor"
                  variant="Outline"
                  className={`${styles.accountChevron} ${dropdownOpen ? styles.accountChevronOpen : ""}`}
                />
              </button>

              {/* Authenticated Dropdown Menu matching Figma (428:2716 / 446:2320) */}
              {dropdownOpen && (
                <div className={styles.accountDropdown}>
                  <div className={styles.accountDropdownHeader}>
                    <div className={styles.dropdownName}>{user.displayName || user.email}</div>
                    <div className={styles.dropdownBadgeRow}>
                      <span className={styles.dropdownRoleBadge}>{user.role}</span>
                      <span
                        className={`${styles.dropdownStatusBadge} ${
                          user.status === "APPROVED"
                            ? styles.statusApproved
                            : styles.statusPending
                        }`}
                      >
                        {user.status === "APPROVED" ? "Verified" : "Pending Review"}
                      </span>
                    </div>
                  </div>

                  <div className={styles.accountDropdownList}>
                    {user.role === "DOCTOR" && (
                      <>
                        <Link
                          href="/dashboard/doctor"
                          className={styles.accountMenuItem}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <Element3 size={20} color="currentColor" variant="Outline" />
                          <span>Dashboard</span>
                        </Link>

                        <Link
                          href="/profile/doctor"
                          className={styles.accountMenuItem}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <Profile size={20} color="currentColor" variant="Outline" />
                          <span>Profile</span>
                        </Link>

                        <Link
                          href="/settings"
                          className={styles.accountMenuItem}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <Setting2 size={20} color="currentColor" variant="Outline" />
                          <span>Settings</span>
                        </Link>

                        <button
                          type="button"
                          className={`${styles.accountMenuItem} ${styles.accountLogoutItem}`}
                          onClick={handleLogout}
                        >
                          <Logout size={20} color="currentColor" variant="Outline" />
                          <span>Log out</span>
                        </button>

                        <Link
                          href="/settings"
                          className={`${styles.accountMenuItem} ${styles.accountDangerItem}`}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <Trash size={20} color="currentColor" variant="Outline" />
                          <span>Delete Account</span>
                        </Link>
                      </>
                    )}

                    {user.role === "FACILITY" && (
                      <>
                        <Link
                          href="/dashboard/facility"
                          className={styles.accountMenuItem}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <Element3 size={20} color="currentColor" variant="Outline" />
                          <span>Dashboard</span>
                        </Link>

                        <Link
                          href="/profile/facility"
                          className={styles.accountMenuItem}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <Profile size={20} color="currentColor" variant="Outline" />
                          <span>Profile</span>
                        </Link>

                        <Link
                          href="/settings"
                          className={styles.accountMenuItem}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <Setting2 size={20} color="currentColor" variant="Outline" />
                          <span>Settings</span>
                        </Link>

                        <button
                          type="button"
                          className={`${styles.accountMenuItem} ${styles.accountLogoutItem}`}
                          onClick={handleLogout}
                        >
                          <Logout size={20} color="currentColor" variant="Outline" />
                          <span>Log out</span>
                        </button>
                      </>
                    )}

                    {user.role === "PLATFORM_ADMIN" && (
                      <>
                        <a
                          href={`${DASHBOARD_URL}/accounts`}
                          className={styles.accountMenuItem}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Element3 size={20} color="currentColor" variant="Outline" />
                          <span>Review Console ↗</span>
                        </a>

                        <button
                          type="button"
                          className={`${styles.accountMenuItem} ${styles.accountLogoutItem}`}
                          onClick={handleLogout}
                        >
                          <Logout size={20} color="currentColor" variant="Outline" />
                          <span>Log out</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Signed-out Visitor: Public Join Us Action with Dropdown
            <div className={styles.joinMenu}>
              <Link href="/join" className={styles.joinButton}>
                {content.joinMenu.label === "Join as" ? "Join Us" : (content.joinMenu.label || "Join Us")}
                <ArrowDown2 size={20} color="currentColor" variant="Outline" />
              </Link>
              <ul className={styles.joinList}>
                {content.joinMenu.items.map((item, index) => {
                  const targetHref =
                    item.icon === "doctor" ? "/login/doctor" : "/login/facility";
                  return (
                    <li key={item.label}>
                      <Link
                        href={targetHref}
                        className={`${styles.joinItem} ${index === 0 ? styles.joinItemActive : ""}`}
                      >
                        {item.icon === "doctor" ? (
                          <Health size={20} color="currentColor" variant="Outline" />
                        ) : (
                          <Buildings2 size={20} color="currentColor" variant="Outline" />
                        )}
                        <span>{item.label}</span>
                        <ArrowDown2
                          size={16}
                          color="currentColor"
                          variant="Outline"
                          className={styles.joinChevron}
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Responsive Mobile Drawer Menu */}
          <details className={styles.mobileMenu}>
            <summary className={styles.mobileMenuButton} aria-label="Open menu">
              <HambergerMenu size={24} color="currentColor" variant="Outline" />
            </summary>
            <nav className={styles.mobileNav} aria-label="Main mobile">
              {navLinks}
              {content.secondaryLink ? (
                <MaybeLink item={content.secondaryLink} className={styles.navLink} />
              ) : null}

              {user ? (
                <div className={styles.mobileUserSection}>
                  <div className={styles.mobileUserHeader}>
                    <strong>{user.displayName}</strong>
                    <span className={styles.mobileUserRole}>{user.role}</span>
                  </div>
                  {user.role === "DOCTOR" ? (
                    <>
                      <Link href="/dashboard/doctor" className={styles.navLink}>
                        Doctor Dashboard
                      </Link>
                      <Link href="/profile/doctor" className={styles.navLink}>
                        Clinical Profile
                      </Link>
                      <Link href="/settings" className={styles.navLink}>
                        Settings
                      </Link>
                    </>
                  ) : user.role === "FACILITY" ? (
                    <>
                      <Link href="/dashboard/facility" className={styles.navLink}>
                        Hospital Dashboard
                      </Link>
                      <Link href="/profile/facility" className={styles.navLink}>
                        Facility Profile
                      </Link>
                      <Link href="/settings" className={styles.navLink}>
                        Settings
                      </Link>
                    </>
                  ) : (
                    <a href={`${DASHBOARD_URL}/accounts`} className={styles.navLink}>
                      Admin Review Console
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={styles.mobileLogoutBtn}
                  >
                    Log Out
                  </button>
                </div>
              ) : (
                <Link href="/join" className={styles.navLink}>
                  {content.joinMenu.label === "Join as" ? "Join Us" : (content.joinMenu.label || "Join Us")}
                </Link>
              )}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
