"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Location, CloseCircle, User, Call, Sms, InfoCircle, TickCircle, Edit2, GalleryAdd } from "iconsax-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { defaultFooterContent } from "@/lib/home-content";
import styles from "@/components/portal/portal.module.css";

interface FacilityProfileData {
  id: string;
  name: string;
  type: string;
  description: string;
  countryId: string | null;
  cityId: string | null;
  locationCity: string;
  locationCountry: string;
  locationSummary: string;
  address: string;
  locationUrl: string | null;
  employeeCount: number;
  hospitalEmail: string;
  officerName: string;
  officerPhoneCountryCode: string;
  officerPhone: string;
  fullOfficerPhone: string;
  logoId: string | null;
  logoUrl: string | null;
}

interface ActiveChangeRequest {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  currentValues: any;
  proposedValues: any;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewerName: string | null;
}

interface ReferenceData {
  countries: Array<{ id: string; nameEn: string; nameAr: string; isGcc: boolean; isoCode: string }>;
  cities: Array<{ id: string; countryId: string; nameEn: string; nameAr: string }>;
  facilityTypes: string[];
}

export default function FacilityProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<FacilityProfileData | null>(null);
  const [activeChangeRequest, setActiveChangeRequest] = useState<ActiveChangeRequest | null>(null);
  const [referenceData, setReferenceData] = useState<ReferenceData>({
    countries: [],
    cities: [],
    facilityTypes: ["GOVERNMENT", "MILITARY", "UNIVERSITY", "PRIVATE", "CLINIC", "OTHER"],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Profile Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewDiffOpen, setIsViewDiffOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    logoId: null as string | null,
    logoUrl: null as string | null,
    type: "MILITARY",
    description: "",
    countryId: "",
    cityId: "",
    address: "",
    locationUrl: "",
    employeeCount: 0,
    hospitalEmail: "",
    officerName: "",
    officerPhoneCountryCode: "+971",
    officerPhone: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verify active session & role
      const sessionRes = await fetch("/api/auth/me", { credentials: "include" });
      if (!sessionRes.ok) {
        router.replace("/login/facility");
        return;
      }
      const sessionData = await sessionRes.json();
      if (sessionData.user?.role !== "FACILITY") {
        router.replace("/login/facility");
        return;
      }

      const res = await fetch("/api/facility/profile", { credentials: "include" });
      if (!res.ok) {
        throw new Error("Unable to load facility profile.");
      }
      const json = await res.json();
      setProfile(json.profile);
      setActiveChangeRequest(json.activeChangeRequest);
      if (json.referenceData) {
        setReferenceData(json.referenceData);
      }

      // Initialize edit form
      setEditForm({
        name: json.profile.name || "",
        logoId: json.profile.logoId || null,
        logoUrl: json.profile.logoUrl || null,
        type: json.profile.type || "MILITARY",
        description: json.profile.description || "",
        countryId: json.profile.countryId || "",
        cityId: json.profile.cityId || "",
        address: json.profile.address || "",
        locationUrl: json.profile.locationUrl || "",
        employeeCount: json.profile.employeeCount || 0,
        hospitalEmail: json.profile.hospitalEmail || "",
        officerName: json.profile.officerName || "",
        officerPhoneCountryCode: json.profile.officerPhoneCountryCode || "+971",
        officerPhone: json.profile.officerPhone || "",
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [router]);

  // Handle Logo Upload
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPEG, WebP, SVG).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Logo image file size must be less than 5MB.");
      return;
    }

    try {
      setUploadingLogo(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const uploadRes = await fetch("/api/files/upload-private", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type,
            base64Data,
            kind: "FACILITY_LOGO",
          }),
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload facility logo.");
        }

        const uploadJson = await uploadRes.json();
        setEditForm((prev) => ({
          ...prev,
          logoId: uploadJson.file.id,
          logoUrl: uploadJson.file.url,
        }));
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert(err.message || "Failed to upload logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch("/api/facility/profile/change-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editForm),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Failed to submit profile change request.");
      }

      setIsEditModalOpen(false);
      setFeedbackMessage(
        "Your profile change request was submitted for platform review. Your approved profile remains active until reviewed."
      );

      // Refresh profile data and active change request
      await loadProfile();
    } catch (err: any) {
      alert(err.message || "Failed to submit change request.");
    } finally {
      setSaving(false);
    }
  };

  const getFacilityInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
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

  const filteredCities = editForm.countryId
    ? referenceData.cities.filter((c) => c.countryId === editForm.countryId)
    : referenceData.cities;

  return (
    <div className={styles.portalContainer}>
      <SiteHeader content={headerContent} activeHref="/profile/facility" />

      {loading ? (
        <div className={styles.loadingStateWrap} style={{ margin: "60px auto", maxWidth: "600px" }}>
          <div className={styles.spinner} />
          <p style={{ color: "#5b6e84", fontSize: "15px" }}>Loading institutional profile...</p>
        </div>
      ) : error ? (
        <div className={styles.errorStateWrap} style={{ margin: "60px auto", maxWidth: "600px" }}>
          <h2 style={{ color: "#0a2647", fontSize: "20px" }}>Unable to load profile</h2>
          <p style={{ color: "#5b6e84", fontSize: "14px" }}>{error}</p>
          <button onClick={() => window.location.reload()} className={styles.btnSolidTeal} style={{ marginTop: "12px" }}>
            Try Again
          </button>
        </div>
      ) : profile ? (
        <>
          {/* Top Navy Hero Section matching Figma 430:4258 */}
          <section className={styles.profileHero}>
            <div className={styles.profileHeroContent}>
              <div className={styles.profileHeroIdentity}>
                <div className={styles.facilityAvatarWrap}>
                  {profile.logoUrl ? (
                    <img
                      src={profile.logoUrl}
                      alt={profile.name}
                      style={{ width: "100%", height: "100%", objectFit: "contain", padding: "10px" }}
                    />
                  ) : (
                    <span>{getFacilityInitials(profile.name)}</span>
                  )}
                </div>

                <div className={styles.profileHeroDetails}>
                  <h1 className={styles.profileHeroName}>{profile.name}</h1>
                  <div className={styles.profileHeroMeta}>
                    <Location size={16} color="currentColor" variant="Outline" />
                    <span>
                      {profile.locationCity}, {profile.locationCountry}
                    </span>
                    <span style={{ margin: "0 6px", opacity: 0.6 }}>•</span>
                    <span style={{ textTransform: "capitalize" }}>{profile.type.toLowerCase()} Healthcare Center</span>
                  </div>
                </div>
              </div>

              <div className={styles.profileHeroActions}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className={styles.btnOutlineWhite}
                >
                  Edit Profile
                </button>
                {/* Route to dedicated Figma 440:3528 Request Medical Staff page */}
                <Link href="/request-medical-staff" className={styles.btnSolidTeal}>
                  Request Medical Staff
                </Link>
              </div>
            </div>
          </section>

          {/* Main Content matching Figma 430:4258 */}
          <main className={styles.portalMain} style={{ paddingTop: "28px" }}>
            {/* Transient Success Feedback Notification */}
            {feedbackMessage && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 20px",
                  backgroundColor: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  borderRadius: "12px",
                  color: "#065f46",
                  fontSize: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <TickCircle size={20} color="#059669" variant="Bold" />
                  <span>{feedbackMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFeedbackMessage(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#065f46", fontSize: "16px" }}
                >
                  ×
                </button>
              </div>
            )}

            {/* Prominent Status Banner for Facility Profile Change Request */}
            {activeChangeRequest?.status === "PENDING" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  padding: "16px 20px",
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "12px",
                  color: "#1e40af",
                }}
              >
                <InfoCircle size={22} color="#2563eb" variant="Bold" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "4px" }}>
                    Profile Change Request Under Platform Review
                  </div>
                  <p style={{ fontSize: "14px", lineHeight: "1.5", margin: 0, color: "#1e3a8a" }}>
                    You submitted profile updates on{" "}
                    <strong>
                      {new Date(activeChangeRequest.createdAt).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}
                    </strong>
                    . Your currently approved profile shown below remains visible to doctors and on public directories
                    until a platform administrator approves your changes.
                  </p>
                  <div style={{ marginTop: "10px", display: "flex", gap: "12px" }}>
                    <button
                      type="button"
                      onClick={() => setIsViewDiffOpen(!isViewDiffOpen)}
                      style={{
                        padding: "6px 14px",
                        backgroundColor: "#2563eb",
                        color: "#ffffff",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 600,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      {isViewDiffOpen ? "Hide Proposed Updates" : "View Proposed Updates"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(true)}
                      style={{
                        padding: "6px 14px",
                        backgroundColor: "#ffffff",
                        color: "#1e40af",
                        border: "1px solid #bfdbfe",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Revise Submission
                    </button>
                  </div>

                  {/* Proposed Values Preview Card */}
                  {isViewDiffOpen && activeChangeRequest.proposedValues && (
                    <div
                      style={{
                        marginTop: "14px",
                        padding: "14px",
                        backgroundColor: "#ffffff",
                        borderRadius: "8px",
                        border: "1px solid #dbeafe",
                        fontSize: "13px",
                        color: "#334155",
                      }}
                    >
                      <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>
                        Submitted Proposed Values:
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
                        <div>
                          <strong style={{ color: "#64748b" }}>Facility Name:</strong>{" "}
                          <div>{activeChangeRequest.proposedValues.name}</div>
                        </div>
                        <div>
                          <strong style={{ color: "#64748b" }}>Facility Type:</strong>{" "}
                          <div>{activeChangeRequest.proposedValues.type}</div>
                        </div>
                        <div>
                          <strong style={{ color: "#64748b" }}>Location:</strong>{" "}
                          <div>
                            {activeChangeRequest.proposedValues.cityName}, {activeChangeRequest.proposedValues.countryName}
                          </div>
                        </div>
                        <div>
                          <strong style={{ color: "#64748b" }}>Officer:</strong>{" "}
                          <div>
                            {activeChangeRequest.proposedValues.officerName} (
                            {activeChangeRequest.proposedValues.officerPhoneCountryCode}{" "}
                            {activeChangeRequest.proposedValues.officerPhone})
                          </div>
                        </div>
                        <div>
                          <strong style={{ color: "#64748b" }}>Hospital Email:</strong>{" "}
                          <div>{activeChangeRequest.proposedValues.hospitalEmail || "—"}</div>
                        </div>
                        <div>
                          <strong style={{ color: "#64748b" }}>Employee Count:</strong>{" "}
                          <div>{activeChangeRequest.proposedValues.employeeCount || "—"}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeChangeRequest?.status === "REJECTED" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  padding: "16px 20px",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "12px",
                  color: "#991b1b",
                }}
              >
                <CloseCircle size={22} color="#dc2626" variant="Bold" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "4px" }}>
                    Profile Change Request Declined
                  </div>
                  <p style={{ fontSize: "14px", lineHeight: "1.5", margin: 0, color: "#7f1d1d" }}>
                    Platform administration reviewed your recent update and declined the changes. Your previous approved
                    profile remains live and unchanged.
                  </p>
                  {activeChangeRequest.rejectionReason && (
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "8px 12px",
                        backgroundColor: "#fee2e2",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#991b1b",
                      }}
                    >
                      Administrative Reason: {activeChangeRequest.rejectionReason}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    style={{
                      marginTop: "12px",
                      padding: "6px 14px",
                      backgroundColor: "#dc2626",
                      color: "#ffffff",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 600,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Submit Revised Changes
                  </button>
                </div>
              </div>
            )}

            {/* HOSPITAL DETAILS Card */}
            <div className={styles.profileCard}>
              <h2 className={styles.profileCardHeading}>Hospital Details</h2>
              <p className={styles.profileBodyText}>{profile.description}</p>
            </div>

            {/* Bottom 2-Column Section (LOCATION & MAP) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
              {/* LOCATION Card */}
              <div className={styles.profileCard}>
                <h2 className={styles.profileCardHeading}>Location & Contact</h2>
                <p className={styles.profileBodyText}>{profile.locationSummary}</p>
                <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "#3b516c" }}>
                    <Location size={18} color="#1b8a8a" variant="Bold" />
                    <span>{profile.address}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "#3b516c" }}>
                    <Sms size={18} color="#1b8a8a" variant="Bold" />
                    <span>Official Email: {profile.hospitalEmail}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "#3b516c" }}>
                    <User size={18} color="#1b8a8a" variant="Bold" />
                    <span>Recruitment Officer: {profile.officerName}</span>
                  </div>
                  {profile.fullOfficerPhone && (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "#3b516c" }}>
                      <Call size={18} color="#1b8a8a" variant="Bold" />
                      <span>Phone: {profile.fullOfficerPhone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* MAP Illustration Card */}
              <div className={styles.mapCard}>
                <div className={styles.mapVisualWrap}>
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 400 200"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ position: "absolute", inset: 0, opacity: 0.15 }}
                  >
                    <path
                      d="M20 50 Q 80 20, 140 60 T 260 70 T 380 40"
                      stroke="#0a2647"
                      strokeWidth="2"
                      fill="none"
                    />
                    <path
                      d="M30 140 Q 90 100, 160 130 T 280 120 T 370 150"
                      stroke="#0a2647"
                      strokeWidth="2"
                      fill="none"
                    />
                    <circle cx="160" cy="80" r="40" stroke="#1b8a8a" strokeWidth="1" strokeDasharray="4 4" fill="none" />
                  </svg>

                  <div className={styles.mapMarkerWrap}>
                    <div className={styles.mapMarkerPulse} />
                    <Location size={28} color="#1b8a8a" variant="Bold" />
                  </div>

                  <div className={styles.mapLocationBadge}>
                    <Location size={14} color="#1b8a8a" variant="Bold" />
                    <span>
                      {profile.locationCity}, {profile.locationCountry}
                    </span>
                  </div>
                </div>

                <div className={styles.mapCardFooter}>
                  <div style={{ fontSize: "13px", color: "#5b6e84" }}>
                    {profile.address || `${profile.locationCity}, ${profile.locationCountry}`}
                  </div>
                  {profile.locationUrl ? (
                    <a
                      href={profile.locationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.mapDirectionsLink}
                    >
                      Get Directions ↗
                    </a>
                  ) : (
                    <span style={{ fontSize: "12px", color: "#8e9baa" }}>Standard Facility Map</span>
                  )}
                </div>
              </div>
            </div>
          </main>

          {/* EDIT PROFILE MODAL: ALL Editable Fields Included */}
          {isEditModalOpen && (
            <div className={styles.modalBackdrop} onClick={() => setIsEditModalOpen(false)}>
              <div
                className={styles.modalCard}
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: "680px", maxHeight: "90vh", overflowY: "auto" }}
              >
                <div className={styles.modalHeader}>
                  <h3 className={styles.modalTitle}>Edit Facility Profile</h3>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className={styles.modalCloseBtn}
                  >
                    ✕
                  </button>
                </div>

                <div
                  style={{
                    padding: "12px 16px",
                    backgroundColor: "#f0fdfa",
                    border: "1px solid #99f6e4",
                    borderRadius: "8px",
                    fontSize: "13px",
                    color: "#0f766e",
                    marginBottom: "16px",
                  }}
                >
                  ℹ️ Changes submitted here create a <strong>profile-change request</strong> for platform administrator
                  review. Your approved profile remains active until reviewed.
                </div>

                <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Facility Name & Type */}
                  <div className={styles.formGrid}>
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Hospital / Facility Name *</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="e.g. Zayed Military Hospital"
                        required
                      />
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Facility Type</label>
                      <select
                        className={styles.formInput}
                        value={editForm.type}
                        onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                      >
                        {referenceData.facilityTypes.map((t) => (
                          <option key={t} value={t}>
                            {t.charAt(0) + t.slice(1).toLowerCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Logo Upload & Preview */}
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Facility Logo</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "4px" }}>
                      <div
                        style={{
                          width: "64px",
                          height: "64px",
                          borderRadius: "10px",
                          border: "1px solid #e2e8f0",
                          backgroundColor: "#f8fafc",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        {editForm.logoUrl ? (
                          <img
                            src={editForm.logoUrl}
                            alt="Preview"
                            style={{ width: "100%", height: "100%", objectFit: "contain", padding: "4px" }}
                          />
                        ) : (
                          <GalleryAdd size={24} color="#94a3b8" />
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileChange}
                          id="facilityLogoInput"
                          style={{ display: "none" }}
                        />
                        <label
                          htmlFor="facilityLogoInput"
                          style={{
                            display: "inline-block",
                            padding: "8px 14px",
                            backgroundColor: "#f1f5f9",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#0f172a",
                            cursor: "pointer",
                          }}
                        >
                          {uploadingLogo ? "Uploading..." : "Upload New Logo"}
                        </label>
                        <span style={{ display: "block", fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                          PNG, JPG, SVG up to 5MB. Visible on public listings once approved.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Facility Description */}
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Hospital Description & Overview *</label>
                    <textarea
                      className={styles.formInput}
                      style={{ height: "100px", padding: "12px 16px", resize: "vertical" }}
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Hospital overview, bed capacity, clinical specialties, and equipment..."
                      required
                    />
                  </div>

                  {/* Country & City */}
                  <div className={styles.formGrid}>
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Country</label>
                      <select
                        className={styles.formInput}
                        value={editForm.countryId}
                        onChange={(e) => setEditForm({ ...editForm, countryId: e.target.value, cityId: "" })}
                      >
                        <option value="">Select Country</option>
                        {referenceData.countries.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nameEn}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.formLabel}>City</label>
                      <select
                        className={styles.formInput}
                        value={editForm.cityId}
                        onChange={(e) => setEditForm({ ...editForm, cityId: e.target.value })}
                      >
                        <option value="">Select City</option>
                        {filteredCities.map((city) => (
                          <option key={city.id} value={city.id}>
                            {city.nameEn}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Physical Address & Location URL */}
                  <div className={styles.formGrid}>
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Physical Address</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        placeholder="e.g. Central District, Healthcare Zone"
                      />
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Location / Map Link URL</label>
                      <input
                        type="url"
                        className={styles.formInput}
                        value={editForm.locationUrl}
                        onChange={(e) => setEditForm({ ...editForm, locationUrl: e.target.value })}
                        placeholder="https://maps.google.com/?q=..."
                      />
                    </div>
                  </div>

                  {/* Official Email & Employee Count */}
                  <div className={styles.formGrid}>
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Official Facility Email</label>
                      <input
                        type="email"
                        className={styles.formInput}
                        value={editForm.hospitalEmail}
                        onChange={(e) => setEditForm({ ...editForm, hospitalEmail: e.target.value })}
                        placeholder="contact@hospital.com"
                      />
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Employee / Bed Count</label>
                      <input
                        type="number"
                        className={styles.formInput}
                        value={editForm.employeeCount}
                        onChange={(e) => setEditForm({ ...editForm, employeeCount: Number(e.target.value) })}
                        placeholder="e.g. 360"
                      />
                    </div>
                  </div>

                  {/* Recruitment Officer Details */}
                  <div className={styles.formGrid}>
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Recruitment Officer Name *</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={editForm.officerName}
                        onChange={(e) => setEditForm({ ...editForm, officerName: e.target.value })}
                        placeholder="Officer Full Name"
                        required
                      />
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Officer Phone Number</label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input
                          type="text"
                          className={styles.formInput}
                          style={{ width: "90px", flexShrink: 0 }}
                          value={editForm.officerPhoneCountryCode}
                          onChange={(e) => setEditForm({ ...editForm, officerPhoneCountryCode: e.target.value })}
                          placeholder="+971"
                        />
                        <input
                          type="tel"
                          className={styles.formInput}
                          style={{ flex: 1 }}
                          value={editForm.officerPhone}
                          onChange={(e) => setEditForm({ ...editForm, officerPhone: e.target.value })}
                          placeholder="50 123 4567"
                        />
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0 0" }}>
                    🔒 <strong>Security & Identity:</strong> Officer login credentials (login email and password) are
                    managed separately to protect account access and will not be altered by this form.
                  </p>

                  <div className={styles.modalActions}>
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className={styles.btnSecondary}
                    >
                      Cancel
                    </button>
                    <button type="submit" disabled={saving || uploadingLogo} className={styles.btnSolidTeal}>
                      {saving ? "Submitting Request..." : "Submit For Admin Approval"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Full Site Footer (sitting at bottom on short pages, flowing on long pages) */}
      <SiteFooter content={defaultFooterContent} />
    </div>
  );
}
