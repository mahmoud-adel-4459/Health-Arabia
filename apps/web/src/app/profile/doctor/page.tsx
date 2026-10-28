"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Location,
  Teacher,
  DocumentDownload,
  DocumentText,
  Edit2,
  CloseCircle,
  InfoCircle,
  TickCircle,
  Warning2,
} from "iconsax-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SimpleAuthFooter } from "@/components/site/SimpleAuthFooter";
import { DoctorProfileEditModal } from "@/components/pages/DoctorProfileEditModal";
import styles from "@/components/portal/portal.module.css";

interface DoctorProfileData {
  id: string;
  fullName: string;
  jobTitle: string;
  yearsOfExperience: number;
  currentPosition: string;
  about: string;
  isAvailable: boolean;
  grade: string;
  location: string;
  photoUrl: string | null;
  cv: {
    id: string;
    originalName: string;
    sizeBytes: number;
    downloadUrl: string;
  } | null;
  specialties: string[];
  experiences: Array<{
    id: string;
    positionTitle: string;
    hospitalName: string;
    duration: string;
    description: string;
  }>;
  educations: Array<{
    id: string;
    degree: string;
    institution: string;
    year: string;
  }>;
  licenses: Array<{
    id: string;
    licenseType: string;
    registrationNumber: string;
    issuingAuthority: string;
    expiryDate: number | null;
  }>;
  languages: Array<{
    language: string;
    proficiency: string;
  }>;
}

export default function DoctorProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<DoctorProfileData | null>(null);
  const [options, setOptions] = useState<{ countries: any[]; specialties: any[] }>({
    countries: [],
    specialties: [],
  });
  const [activeChangeRequest, setActiveChangeRequest] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadProfile = async () => {
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

      const res = await fetch("/api/doctor/profile", { credentials: "include" });
      if (!res.ok) {
        throw new Error("Unable to load doctor profile.");
      }
      const json = await res.json();
      setProfile(json.profile);
      if (json.options) setOptions(json.options);
      setActiveChangeRequest(json.activeChangeRequest || null);
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

  const getInitials = (name: string) => {
    const parts = name.replace(/^Dr\.\s*/i, "").trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
      <SiteHeader content={headerContent} activeHref="/profile/doctor" />

      {loading ? (
        <div className={styles.loadingStateWrap} style={{ margin: "60px auto", maxWidth: "600px" }}>
          <div className={styles.spinner} />
          <p style={{ color: "#5b6e84", fontSize: "15px" }}>Loading your candidate profile...</p>
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
          {/* Toast Notification */}
          {toastMessage && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#166534",
                padding: "14px 20px",
                borderRadius: "10px",
                maxWidth: "1200px",
                margin: "16px auto 0",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              <TickCircle size={20} color="#16a34a" variant="Bold" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Pending / Rejected Profile Change Status Banners */}
          {activeChangeRequest?.status === "PENDING" && (
            <div
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1e40af",
                padding: "16px 20px",
                borderRadius: "12px",
                maxWidth: "1200px",
                margin: "16px auto 0",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <InfoCircle size={24} color="#2563eb" variant="Bold" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong style={{ fontSize: "15px", display: "block", marginBottom: "4px" }}>
                  Profile Changes Under Platform Review
                </strong>
                <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.5, color: "#1e3a8a" }}>
                  You submitted updates to your profile on{" "}
                  {new Date(activeChangeRequest.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  . Our platform administrators are reviewing your submitted credentials. Your live approved profile
                  remains active for healthcare facilities and active job opportunities until changes are approved.
                </p>
              </div>
            </div>
          )}

          {activeChangeRequest?.status === "REJECTED" && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                padding: "16px 20px",
                borderRadius: "12px",
                maxWidth: "1200px",
                margin: "16px auto 0",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <Warning2 size={24} color="#dc2626" variant="Bold" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong style={{ fontSize: "15px", display: "block", marginBottom: "4px" }}>
                  Recent Profile Change Request Declined
                </strong>
                <p style={{ margin: "0 0 6px", fontSize: "14px", lineHeight: 1.5 }}>
                  Your recent profile changes were reviewed and declined by the platform administration:
                </p>
                <div
                  style={{
                    background: "#fee2e2",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#7f1d1d",
                  }}
                >
                  &ldquo;{activeChangeRequest.rejectionReason}&rdquo;
                </div>
                <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#b91c1c" }}>
                  Your live profile remained completely unchanged. You can click &ldquo;Edit Profile&rdquo; to review your credentials and submit an updated request.
                </p>
              </div>
            </div>
          )}

          {/* Top Navy Hero Section matching Figma 430:2811 */}
          <section className={styles.profileHero}>
            <div className={styles.profileHeroContent}>
              <div className={styles.profileHeroIdentity}>
                <div className={styles.doctorAvatarWrap}>
                  {profile.photoUrl ? (
                    <img
                      src={profile.photoUrl}
                      alt={profile.fullName}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span>{getInitials(profile.fullName)}</span>
                  )}
                </div>

                <div className={styles.profileHeroDetails}>
                  <div className={styles.profileHeroNameRow}>
                    <h1 className={styles.profileHeroName}>{profile.fullName}</h1>
                    {profile.isAvailable && (
                      <span className={styles.availablePill}>Available for Opportunities</span>
                    )}
                  </div>
                  <p className={styles.profileHeroSubtitle}>
                    {profile.jobTitle} • {profile.yearsOfExperience} Years Experience
                  </p>
                  <div className={styles.profileHeroMeta}>
                    <div style={{ display: "flex", alignContent: "center", gap: "4px" }}>
                      <Location size={16} color="currentColor" variant="Outline" />
                      <span>{profile.location}</span>
                    </div>
                    <div style={{ display: "flex", alignContent: "center", gap: "4px" }}>
                      <Teacher size={16} color="currentColor" variant="Outline" />
                      <span>{profile.grade}</span>
                    </div>
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
                {profile.cv && (
                  <a
                    href={profile.cv.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.btnSolidTeal}
                  >
                    <DocumentDownload size={18} color="currentColor" />
                    Download CV
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* Main 2-Column Profile Content matching Figma 430:2811 */}
          <main className={styles.portalMain} style={{ paddingTop: "36px" }}>
            <div className={styles.profileSectionsGrid}>
              {/* Left Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* ABOUT ME Card */}
                <div className={styles.profileCard}>
                  <h2 className={styles.profileCardHeading}>About Me</h2>
                  <p className={styles.profileBodyText}>{profile.about}</p>
                </div>

                {/* PROFESSIONAL EXPERIENCE Card */}
                <div className={styles.profileCard}>
                  <h2 className={styles.profileCardHeading}>Professional Experience</h2>
                  {profile.experiences.length === 0 ? (
                    <p style={{ color: "#8e9baa", fontSize: "14px" }}>No experience records added.</p>
                  ) : (
                    profile.experiences.map((exp) => (
                      <div key={exp.id} className={styles.experienceItem}>
                        <div className={styles.experienceTopRow}>
                          <h3 className={styles.experienceTitle}>{exp.positionTitle}</h3>
                          <span className={styles.experienceDuration}>{exp.duration}</span>
                        </div>
                        <span className={styles.experienceOrg}>{exp.hospitalName}</span>
                        {exp.description && <p className={styles.experienceDesc}>{exp.description}</p>}
                      </div>
                    ))
                  )}
                </div>

                {/* EDUCATION Card */}
                <div className={styles.profileCard}>
                  <h2 className={styles.profileCardHeading}>Education</h2>
                  {profile.educations.length === 0 ? (
                    <p style={{ color: "#8e9baa", fontSize: "14px" }}>No education credentials listed.</p>
                  ) : (
                    profile.educations.map((edu) => (
                      <div key={edu.id} className={styles.experienceItem}>
                        <h3 className={styles.experienceTitle}>{edu.degree}</h3>
                        <span className={styles.experienceOrg}>
                          {edu.institution} — {edu.year}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* MEDICAL SPECIALTIES Card */}
                <div className={styles.profileCard}>
                  <h2 className={styles.profileCardHeading}>Medical Specialties</h2>
                  <div className={styles.tagsCloud}>
                    {profile.specialties.length === 0 ? (
                      <span className={styles.specialtyPill}>Paediatric Cardiology</span>
                    ) : (
                      profile.specialties.map((spec, idx) => (
                        <span key={idx} className={styles.specialtyPill}>
                          {spec}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* CURRENT POSITION Card */}
                <div className={styles.profileCard}>
                  <h2 className={styles.profileCardHeading}>Current Position</h2>
                  <p style={{ fontSize: "16px", fontWeight: 700, color: "#0a2647" }}>
                    {profile.currentPosition}
                  </p>
                </div>

                {/* LICENSES & CERTIFICATIONS Card */}
                <div className={styles.profileCard}>
                  <h2 className={styles.profileCardHeading}>Licenses &amp; Certifications</h2>
                  {profile.licenses.length === 0 ? (
                    <p style={{ color: "#8e9baa", fontSize: "14px" }}>No licenses registered.</p>
                  ) : (
                    profile.licenses.map((lic) => (
                      <div key={lic.id} className={styles.licenseItem}>
                        <h3 className={styles.licenseTitle}>{lic.licenseType}</h3>
                        <span className={styles.licenseMeta}>
                          Reg No: {lic.registrationNumber}
                          {lic.expiryDate ? ` • Expiry: ${lic.expiryDate}` : ""}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* LANGUAGES Card */}
                <div className={styles.profileCard}>
                  <h2 className={styles.profileCardHeading}>Languages</h2>
                  {profile.languages.length === 0 ? (
                    <p style={{ color: "#8e9baa", fontSize: "14px" }}>Arabic, English</p>
                  ) : (
                    profile.languages.map((lang, idx) => (
                      <div key={idx} className={styles.languageRow}>
                        <span className={styles.langName}>{lang.language}</span>
                        <span className={styles.langProficiency}>
                          {lang.proficiency.charAt(0).toUpperCase() + lang.proficiency.slice(1).toLowerCase()}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* UPLOADED CV Card */}
                <div className={styles.profileCard}>
                  <h2 className={styles.profileCardHeading}>Uploaded CV</h2>
                  {profile.cv ? (
                    <div className={styles.cvFileRow}>
                      <div className={styles.cvFileInfo}>
                        <DocumentText size={20} color="#1b8a8a" variant="Outline" />
                        <span style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {profile.cv.originalName}
                        </span>
                      </div>
                      <a
                        href={profile.cv.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.cvDownloadLink}
                      >
                        Download
                      </a>
                    </div>
                  ) : (
                    <p style={{ color: "#8e9baa", fontSize: "14px" }}>No CV currently attached.</p>
                  )}
                </div>
              </div>
            </div>
          </main>

          {/* Doctor Profile Full 6-Step Edit Modal */}
          {isEditModalOpen && (
            <DoctorProfileEditModal
              isOpen={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              onSuccess={(msg) => {
                setToastMessage(msg);
                loadProfile();
              }}
              initialData={profile}
              options={options}
            />
          )}
        </>
      ) : null}

      <SimpleAuthFooter />
    </div>
  );
}
