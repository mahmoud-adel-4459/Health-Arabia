"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeSlash,
  TickCircle,
  CloseCircle,
  ShieldSecurity,
  Trash,
} from "iconsax-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SimpleAuthFooter } from "@/components/site/SimpleAuthFooter";
import styles from "@/components/portal/portal.module.css";

interface AccountSettingsData {
  id: string;
  role: "DOCTOR" | "FACILITY" | "PLATFORM_ADMIN";
  fullName: string;
  email: string;
  mobileNumber: string;
  preferredLocale: "EN" | "AR";
  status: string;
  facilityName: string | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<AccountSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [preferredLocale, setPreferredLocale] = useState<"EN" | "AR">("EN");

  // Password Fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Deletion Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [submittingDeletion, setSubmittingDeletion] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        setError(null);

        // Verify active session
        const sessionRes = await fetch("/api/auth/me", { credentials: "include" });
        if (!sessionRes.ok) {
          router.replace("/join");
          return;
        }

        const res = await fetch("/api/account/settings", { credentials: "include" });
        if (!res.ok) {
          throw new Error("Unable to load account settings.");
        }
        const json = await res.json();
        setSettings(json.settings);
        setFullName(json.settings.fullName);
        setMobileNumber(json.settings.mobileNumber);
        setPreferredLocale(json.settings.preferredLocale);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load settings.");
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [router]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccessMessage(null);

      // Update general settings
      const updateRes = await fetch("/api/account/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fullName, mobileNumber, preferredLocale }),
      });

      if (!updateRes.ok) {
        const errData = await updateRes.json();
        throw new Error(errData.message || "Failed to update profile settings.");
      }

      // If user filled password change fields, submit password update
      if (currentPassword || newPassword || confirmNewPassword) {
        if (!currentPassword || !newPassword || !confirmNewPassword) {
          throw new Error("Please complete all three password fields to change your password.");
        }
        if (newPassword !== confirmNewPassword) {
          throw new Error("New password and confirm password do not match.");
        }
        if (newPassword.length < 8) {
          throw new Error("New password must be at least 8 characters long.");
        }

        const passRes = await fetch("/api/account/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
        });

        const passData = await passRes.json();
        if (!passRes.ok) {
          throw new Error(passData.message || "Failed to update password.");
        }

        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      }

      setSuccessMessage("Settings saved successfully.");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(err.message || "An error occurred while saving settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleRequestDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingDeletion(true);
      const res = await fetch("/api/account/delete-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: deletionReason }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to submit deletion request.");
      }

      setIsDeleteModalOpen(false);
      alert("Account deletion request submitted. Our platform administration team will process your request.");
    } catch (err: any) {
      alert(err.message || "Unable to submit deletion request.");
    } finally {
      setSubmittingDeletion(false);
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
      <SiteHeader content={headerContent} activeHref="/settings" />

      <main className={styles.portalMain}>
        {loading ? (
          <div className={styles.loadingStateWrap}>
            <div className={styles.spinner} />
            <p style={{ color: "#5b6e84", fontSize: "15px" }}>Loading account settings...</p>
          </div>
        ) : error ? (
          <div className={styles.errorStateWrap}>
            <h2 style={{ color: "#0a2647", fontSize: "20px" }}>Unable to load settings</h2>
            <p style={{ color: "#5b6e84", fontSize: "14px" }}>{error}</p>
            <button onClick={() => window.location.reload()} className={styles.btnSolidTeal} style={{ marginTop: "12px" }}>
              Try Again
            </button>
          </div>
        ) : settings ? (
          <>
            {/* Header matching Figma 564:9584 */}
            <div className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>Settings</h1>
              <p className={styles.pageSubtitle}>
                Manage your account, preferences and privacy settings.
              </p>
            </div>

            {/* Success Message Banner */}
            {successMessage && (
              <div
                style={{
                  background: "#e8f3f3",
                  border: "1px solid #1b8a8a",
                  borderRadius: "12px",
                  padding: "14px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  color: "#0a2647",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                <TickCircle size={20} color="#1b8a8a" variant="Bold" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Settings Card matching Figma 564:9584 */}
            <form onSubmit={handleSaveSettings} className={styles.settingsFormCard}>
              {/* Section 1: User / Officer Information */}
              <div className={styles.settingsSection}>
                <div className={styles.settingsSectionTitleRow}>
                  <div className={styles.settingsSectionBar} />
                  <h2 className={styles.settingsSectionTitle}>
                    {settings.role === "FACILITY"
                      ? "Recruitment Officer information"
                      : settings.role === "DOCTOR"
                      ? "Doctor Information"
                      : "Administrator Information"}
                  </h2>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Full Name</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. John Doe"
                      required
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Email Address</label>
                    <input
                      type="email"
                      className={`${styles.formInput} ${styles.formInputReadonly}`}
                      value={settings.email}
                      readOnly
                      title="Account email address cannot be changed directly."
                    />
                  </div>
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel}>Mobile Number</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="e.g. +966 50 000 0000"
                  />
                </div>
              </div>

              {/* Section 2: Change Password */}
              <div className={styles.settingsSection}>
                <div className={styles.settingsSectionTitleRow}>
                  <div className={styles.settingsSectionBar} />
                  <h2 className={styles.settingsSectionTitle}>Change Password</h2>
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel}>Current Password</label>
                  <div className={styles.inputIconWrap}>
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      className={styles.formInput}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className={styles.inputIconBtn}
                      aria-label="Toggle password visibility"
                    >
                      {showCurrentPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>New Password</label>
                    <div className={styles.inputIconWrap}>
                      <input
                        type={showNewPassword ? "text" : "password"}
                        className={styles.formInput}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter your new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className={styles.inputIconBtn}
                        aria-label="Toggle password visibility"
                      >
                        {showNewPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Confirm New Password</label>
                    <div className={styles.inputIconWrap}>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        className={styles.formInput}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Confirm New Password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className={styles.inputIconBtn}
                        aria-label="Toggle password visibility"
                      >
                        {showConfirmPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Choose your language */}
              <div className={styles.settingsSection}>
                <div className={styles.settingsSectionTitleRow}>
                  <div className={styles.settingsSectionBar} />
                  <h2 className={styles.settingsSectionTitle}>Choose your language</h2>
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel}>Language</label>
                  <select
                    className={styles.formInput}
                    value={preferredLocale}
                    onChange={(e) => setPreferredLocale(e.target.value as "EN" | "AR")}
                    style={{ cursor: "pointer" }}
                  >
                    <option value="EN">English</option>
                    <option value="AR">العربية (Arabic)</option>
                  </select>
                </div>
              </div>

              {/* Footer Actions */}
              <div className={styles.settingsActionsRow}>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className={styles.btnDangerOutline}
                >
                  <Trash size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
                  Request Account Deletion
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className={styles.btnSolidTeal}
                  style={{ minWidth: "160px", justifyContent: "center" }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>

            {/* Account Deletion Request Modal */}
            {isDeleteModalOpen && (
              <div className={styles.modalBackdrop}>
                <div className={styles.modalCard}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h2 className={styles.modalTitle} style={{ color: "#dc2626" }}>
                      Request Account Deletion
                    </h2>
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(false)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#8e9baa" }}
                    >
                      <CloseCircle size={22} color="currentColor" />
                    </button>
                  </div>

                  <p className={styles.modalDesc}>
                    In accordance with Health Arabia platform policy and data retention regulations, account deletion requests are reviewed by our platform administrators. Submitting this request will initiate review and deactivate access upon completion.
                  </p>

                  <form onSubmit={handleRequestDeletion} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Reason for deletion (optional)</label>
                      <textarea
                        className={styles.formInput}
                        style={{ height: "90px", padding: "12px 16px", resize: "vertical" }}
                        value={deletionReason}
                        onChange={(e) => setDeletionReason(e.target.value)}
                        placeholder="Please tell us why you wish to close your account..."
                      />
                    </div>

                    <div className={styles.modalActions}>
                      <button
                        type="button"
                        onClick={() => setIsDeleteModalOpen(false)}
                        className={styles.btnSecondary}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingDeletion}
                        className={styles.btnDangerOutline}
                        style={{ background: "#dc2626", color: "#ffffff", borderColor: "#dc2626" }}
                      >
                        {submittingDeletion ? "Submitting..." : "Confirm Deletion Request"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        ) : null}
      </main>

      <SimpleAuthFooter />
    </div>
  );
}
