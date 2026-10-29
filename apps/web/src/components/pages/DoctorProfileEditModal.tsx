"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { CloseCircle, Add, Trash, DocumentUpload, Camera, ArrowRight2 } from "iconsax-react";
import styles from "@/components/portal/portal.module.css";
import pageStyles from "./pages.module.css";

interface CountryOption {
  id: string;
  name: string;
  isGcc?: boolean;
}

interface SpecialtyOption {
  id: string;
  name: string;
  slug?: string;
}

interface EducationEntry {
  degree: string;
  institution: string;
  graduationYear?: number | null;
  isPrimary?: boolean;
}

interface LicenseEntry {
  licenseType: string;
  registrationNumber: string;
  issuingAuthority: string;
  expiryDate?: string | null;
}

interface ExperienceEntry {
  organization: string;
  position: string;
  startDate: string;
  endDate?: string | null;
  responsibilities?: string | null;
}

interface LanguageEntry {
  language: string;
  proficiency: "NATIVE" | "FLUENT" | "PROFESSIONAL" | "BASIC";
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  initialData: any;
  options: {
    countries: CountryOption[];
    specialties: SpecialtyOption[];
  };
}

const STEPS = [
  { id: 1, label: "Personal" },
  { id: 2, label: "Professional" },
  { id: 3, label: "Education" },
  { id: 4, label: "Licenses" },
  { id: 5, label: "Experience" },
  { id: 6, label: "Languages & CV" },
];

export function DoctorProfileEditModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  options,
}: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Personal Details
  const [fullName, setFullName] = useState(initialData?.fullName || "");
  const [dateOfBirth, setDateOfBirth] = useState(initialData?.dateOfBirth || "");
  const [gender, setGender] = useState(initialData?.gender || "MALE");
  const [nationalityId, setNationalityId] = useState(initialData?.nationalityId || options.countries[0]?.id || "");
  const [residenceCountryId, setResidenceCountryId] = useState(
    initialData?.residenceCountryId || options.countries[0]?.id || ""
  );
  const [mobileE164, setMobileE164] = useState(initialData?.mobileE164 || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [photoAssetId, setPhotoAssetId] = useState<string | null>(initialData?.photoAssetId || null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.photoUrl || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Step 2: Professional Details
  const [jobTitle, setJobTitle] = useState(initialData?.jobTitle || "");
  const [primarySpecialtyId, setPrimarySpecialtyId] = useState(
    initialData?.primarySpecialtyId || options.specialties[0]?.id || ""
  );
  const [about, setAbout] = useState(initialData?.about || "");
  const [yearsOfExperience, setYearsOfExperience] = useState<number>(initialData?.yearsOfExperience || 0);
  const [currentPosition, setCurrentPosition] = useState(initialData?.currentPosition || "");
  const [isAvailable, setIsAvailable] = useState<boolean>(initialData?.isAvailable ?? true);
  const [preferredCountryIds, setPreferredCountryIds] = useState<string[]>(
    initialData?.preferredCountryIds || []
  );
  const [additionalSpecialtyIds, setAdditionalSpecialtyIds] = useState<string[]>(
    initialData?.additionalSpecialtyIds || []
  );

  // Step 3: Education
  const [educations, setEducations] = useState<EducationEntry[]>(
    initialData?.educations && initialData.educations.length > 0
      ? initialData.educations
      : [{ degree: "", institution: "", graduationYear: 2020, isPrimary: true }]
  );

  // Step 4: Licenses
  const [licenses, setLicenses] = useState<LicenseEntry[]>(
    initialData?.licenses && initialData.licenses.length > 0
      ? initialData.licenses
      : [{ licenseType: "", registrationNumber: "", issuingAuthority: "", expiryDate: "" }]
  );

  // Step 5: Experience
  const [experiences, setExperiences] = useState<ExperienceEntry[]>(
    initialData?.experiences && initialData.experiences.length > 0
      ? initialData.experiences
      : [{ organization: "", position: "", startDate: "", endDate: "", responsibilities: "" }]
  );

  // Step 6: Languages & CV
  const [languages, setLanguages] = useState<LanguageEntry[]>(
    initialData?.languages && initialData.languages.length > 0
      ? initialData.languages
      : [{ language: "English", proficiency: "FLUENT" }]
  );
  const [cvAssetId, setCvAssetId] = useState<string | null>(initialData?.cv?.id || null);
  const [cvFileName, setCvFileName] = useState<string | null>(initialData?.cv?.originalName || null);
  const [uploadingCv, setUploadingCv] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Unsaved-change detection: compare every editable value with its value when the modal opened
  const formSnapshot = JSON.stringify([
    fullName, dateOfBirth, gender, nationalityId, residenceCountryId, mobileE164, email, photoAssetId,
    jobTitle, primarySpecialtyId, about, yearsOfExperience, currentPosition, isAvailable,
    preferredCountryIds, additionalSpecialtyIds, educations, licenses, experiences, languages, cvAssetId,
  ]);
  const initialSnapshotRef = useRef(formSnapshot);
  const isDirty = formSnapshot !== initialSnapshotRef.current;

  // Close via the X button, Cancel, or Escape. Never discard edits silently (same confirm() pattern as the dashboard).
  const requestClose = () => {
    if (submitting) return;
    if (isDirty && !window.confirm("Discard your unsaved profile changes? They have not been submitted for review.")) {
      return;
    }
    onClose();
  };
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  // Portal target exists only in the browser
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Lock background scrolling (compensating for the scrollbar width), focus the dialog, restore both on close
  useEffect(() => {
    if (!isOpen || !mounted) return;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestCloseRef.current();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, mounted]);

  if (!isOpen) return null;

  // Upload private photo handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPG or PNG).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image file exceeds 5MB size limit.");
      return;
    }

    setUploadingPhoto(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        setPhotoPreview(base64Data);

        const res = await fetch("/api/files/upload-private", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type,
            base64Data,
            kind: "PROFILE_PHOTO",
          }),
        });

        const data = await res.json();
        if (res.ok && data.file?.id) {
          setPhotoAssetId(data.file.id);
        } else {
          setError(data.message || "Failed to upload photo.");
        }
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setError("Error processing image upload.");
      setUploadingPhoto(false);
    }
  };

  // Upload private CV handler
  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError("CV file exceeds 15MB limit.");
      return;
    }

    setUploadingCv(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const res = await fetch("/api/files/upload-private", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type || "application/pdf",
            base64Data,
            kind: "CV",
          }),
        });

        const data = await res.json();
        if (res.ok && data.file?.id) {
          setCvAssetId(data.file.id);
          setCvFileName(file.name);
        } else {
          setError(data.message || "Failed to upload CV.");
        }
        setUploadingCv(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setError("Error processing CV upload.");
      setUploadingCv(false);
    }
  };

  const togglePreferredCountry = (id: string) => {
    if (preferredCountryIds.includes(id)) {
      setPreferredCountryIds(preferredCountryIds.filter((cid) => cid !== id));
    } else {
      setPreferredCountryIds([...preferredCountryIds, id]);
    }
  };

  const toggleAdditionalSpecialty = (id: string) => {
    if (additionalSpecialtyIds.includes(id)) {
      setAdditionalSpecialtyIds(additionalSpecialtyIds.filter((sid) => sid !== id));
    } else {
      setAdditionalSpecialtyIds([...additionalSpecialtyIds, id]);
    }
  };

  // Education Helpers
  const addEducation = () => {
    setEducations([...educations, { degree: "", institution: "", graduationYear: 2022, isPrimary: false }]);
  };
  const removeEducation = (index: number) => {
    setEducations(educations.filter((_, i) => i !== index));
  };
  const updateEducation = (index: number, field: keyof EducationEntry, value: any) => {
    const copy = [...educations];
    copy[index] = { ...copy[index], [field]: value };
    setEducations(copy);
  };

  // License Helpers
  const addLicense = () => {
    setLicenses([...licenses, { licenseType: "", registrationNumber: "", issuingAuthority: "", expiryDate: "" }]);
  };
  const removeLicense = (index: number) => {
    setLicenses(licenses.filter((_, i) => i !== index));
  };
  const updateLicense = (index: number, field: keyof LicenseEntry, value: any) => {
    const copy = [...licenses];
    copy[index] = { ...copy[index], [field]: value };
    setLicenses(copy);
  };

  // Experience Helpers
  const addExperience = () => {
    setExperiences([...experiences, { organization: "", position: "", startDate: "", endDate: "", responsibilities: "" }]);
  };
  const removeExperience = (index: number) => {
    setExperiences(experiences.filter((_, i) => i !== index));
  };
  const updateExperience = (index: number, field: keyof ExperienceEntry, value: any) => {
    const copy = [...experiences];
    copy[index] = { ...copy[index], [field]: value };
    setExperiences(copy);
  };

  // Language Helpers
  const addLanguage = () => {
    setLanguages([...languages, { language: "", proficiency: "PROFESSIONAL" }]);
  };
  const removeLanguage = (index: number) => {
    setLanguages(languages.filter((_, i) => i !== index));
  };
  const updateLanguage = (index: number, field: keyof LanguageEntry, value: any) => {
    const copy = [...languages];
    copy[index] = { ...copy[index], [field]: value };
    setLanguages(copy);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Please provide your full legal name.");
      setCurrentStep(1);
      return;
    }
    if (!mobileE164.trim()) {
      setError("Please enter your mobile phone number.");
      setCurrentStep(1);
      return;
    }

    setSubmitting(true);

    const payload = {
      fullName: fullName.trim(),
      dateOfBirth: dateOfBirth || null,
      gender,
      nationalityId: nationalityId || null,
      residenceCountryId: residenceCountryId || null,
      mobileE164: mobileE164.trim(),
      email: email.trim() || null,
      photoAssetId,
      jobTitle: jobTitle.trim(),
      primarySpecialtyId: primarySpecialtyId || null,
      additionalSpecialtyIds: additionalSpecialtyIds.filter((id) => id !== primarySpecialtyId),
      about: about.trim(),
      yearsOfExperience: Number(yearsOfExperience) || 0,
      currentPosition: currentPosition.trim(),
      isAvailable,
      preferredCountryIds,
      educations: educations.filter((e) => e.degree.trim() && e.institution.trim()),
      licenses: licenses.filter((l) => l.licenseType.trim() && l.registrationNumber.trim()),
      experiences: experiences.filter((exp) => exp.organization.trim() && exp.position.trim()),
      languages: languages.filter((lang) => lang.language.trim()),
      cvAssetId,
    };

    try {
      const res = await fetch("/api/doctor/profile/change-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to submit profile change request.");
      }

      onSuccess(
        "Your profile change request has been submitted for platform review. Your live profile remains active until approved."
      );
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while saving profile changes.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  // Rendered into document.body so no ancestor stacking context, transform, or overflow can affect positioning
  return createPortal(
    <div className={styles.modalOverlay}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="doctor-profile-edit-title"
        tabIndex={-1}
        className={styles.modalCard}
        style={{
          maxWidth: "840px",
          maxHeight: "calc(100dvh - 32px)",
          display: "flex",
          flexDirection: "column",
          gap: 0,
          padding: "clamp(18px, 4vw, 28px) clamp(16px, 4vw, 32px)",
          borderRadius: "20px",
          overflow: "hidden",
          outline: "none",
        }}
      >
        {/* Modal Header (fixed; only the form body scrolls) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "16px", flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            <h2 id="doctor-profile-edit-title" style={{ fontSize: "22px", fontWeight: 700, color: "#0a2647", margin: 0 }}>
              Edit Doctor Profile
            </h2>
            <p style={{ fontSize: "14px", color: "#5b6e84", margin: "4px 0 0" }}>
              Update your registration details, qualifications, and credentials. Changes require platform review before activation.
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={submitting}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", flexShrink: 0 }}
            aria-label="Close edit profile dialog"
          >
            <CloseCircle size={24} color="currentColor" />
          </button>
        </div>

        {/* Stepper Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "4px",
            background: "#f8fafc",
            borderRadius: "12px",
            padding: "8px 12px",
            marginBottom: "20px",
            border: "1px solid #e2e8f0",
            flexShrink: 0,
            overflowX: "auto",
          }}
        >
          {STEPS.map((s) => {
            const isActive = currentStep === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(s.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: isActive ? "#0284c7" : "transparent",
                  color: isActive ? "#ffffff" : "#64748b",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "13px",
                  fontWeight: isActive ? 600 : 500,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: isActive ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                    color: isActive ? "#ffffff" : "#475569",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  {s.id}
                </span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "10px",
              padding: "10px 16px",
              color: "#991b1b",
              fontSize: "13px",
              marginBottom: "16px",
              flexShrink: 0,
            }}
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Form Body Scroll Area */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", paddingRight: "6px", marginBottom: "16px", overscrollBehavior: "contain" }}>
          {/* STEP 1: Personal Info */}
          {currentStep === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Photo Upload Row */}
              <div style={{ display: "flex", alignItems: "center", gap: "20px", padding: "12px 0" }}>
                <div
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "50%",
                    background: "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    border: "2px solid #0284c7",
                    position: "relative",
                  }}
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <Camera size={28} color="#94a3b8" />
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    style={{
                      background: "#f0f9ff",
                      color: "#0284c7",
                      border: "1px solid #bae6fd",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {uploadingPhoto ? "Uploading..." : "Upload New Photo"}
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    style={{ display: "none" }}
                  />
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                    JPG or PNG format. Private to platform administration.
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: "16px" }}>
                <div>
                  <label className={styles.formLabel}>Full Legal Name *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={styles.formLabel}>Date of Birth</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: "16px" }}>
                <div>
                  <label className={styles.formLabel}>Gender</label>
                  <select
                    className={styles.formInput}
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
                <div>
                  <label className={styles.formLabel}>Nationality</label>
                  <select
                    className={styles.formInput}
                    value={nationalityId}
                    onChange={(e) => setNationalityId(e.target.value)}
                  >
                    {options.countries.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: "16px" }}>
                <div>
                  <label className={styles.formLabel}>Country of Residence</label>
                  <select
                    className={styles.formInput}
                    value={residenceCountryId}
                    onChange={(e) => setResidenceCountryId(e.target.value)}
                  >
                    {options.countries.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={styles.formLabel}>Mobile Phone (Login Identifier) *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={mobileE164}
                    onChange={(e) => setMobileE164(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={styles.formLabel}>Email Address</label>
                <input
                  type="email"
                  className={styles.formInput}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* STEP 2: Professional Info */}
          {currentStep === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: "16px" }}>
                <div>
                  <label className={styles.formLabel}>Job Title / Clinical Grade *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Consultant Cardiologist"
                    required
                  />
                </div>
                <div>
                  <label className={styles.formLabel}>Primary Specialty *</label>
                  <select
                    className={styles.formInput}
                    value={primarySpecialtyId}
                    onChange={(e) => setPrimarySpecialtyId(e.target.value)}
                  >
                    {options.specialties.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: "16px" }}>
                <div>
                  <label className={styles.formLabel}>Years of Clinical Experience</label>
                  <input
                    type="number"
                    className={styles.formInput}
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(Number(e.target.value))}
                    min={0}
                    max={60}
                  />
                </div>
                <div>
                  <label className={styles.formLabel}>Current Hospital Position</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={currentPosition}
                    onChange={(e) => setCurrentPosition(e.target.value)}
                    placeholder="e.g. Senior Staff Physician"
                  />
                </div>
              </div>

              <div>
                <label className={styles.formLabel}>Professional Summary / About Me</label>
                <textarea
                  className={styles.formInput}
                  rows={4}
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Describe your medical training, board certifications, and specialized clinical focus..."
                />
              </div>

              {/* Additional Specialties */}
              <div>
                <label className={styles.formLabel}>Additional Specialties</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "6px" }}>
                  {options.specialties
                    .filter((s) => s.id !== primarySpecialtyId)
                    .map((s) => {
                      const selected = additionalSpecialtyIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleAdditionalSpecialty(s.id)}
                          style={{
                            padding: "6px 14px",
                            borderRadius: "20px",
                            border: selected ? "1px solid #0284c7" : "1px solid #cbd5e1",
                            background: selected ? "#e0f2fe" : "#ffffff",
                            color: selected ? "#0369a1" : "#475569",
                            fontSize: "13px",
                            fontWeight: selected ? 600 : 500,
                            cursor: "pointer",
                          }}
                        >
                          {selected ? "✓ " : "+ "}
                          {s.name}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Preferred GCC Countries */}
              <div>
                <label className={styles.formLabel}>Target GCC Practice Destinations</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "6px" }}>
                  {options.countries
                    .filter((c) => c.isGcc)
                    .map((c) => {
                      const selected = preferredCountryIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => togglePreferredCountry(c.id)}
                          style={{
                            padding: "6px 14px",
                            borderRadius: "20px",
                            border: selected ? "1px solid #0284c7" : "1px solid #cbd5e1",
                            background: selected ? "#e0f2fe" : "#ffffff",
                            color: selected ? "#0369a1" : "#475569",
                            fontSize: "13px",
                            fontWeight: selected ? 600 : 500,
                            cursor: "pointer",
                          }}
                        >
                          {selected ? "✓ " : "+ "}
                          {c.name}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Availability Toggle */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
                <input
                  type="checkbox"
                  id="availToggle"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "#0284c7" }}
                />
                <label htmlFor="availToggle" style={{ fontSize: "14px", fontWeight: 600, color: "#0a2647", cursor: "pointer" }}>
                  Actively available for clinical placements in the GCC
                </label>
              </div>
            </div>
          )}

          {/* STEP 3: Education */}
          {currentStep === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  Add your academic degrees starting with your primary medical qualification.
                </span>
                <button
                  type="button"
                  onClick={addEducation}
                  style={{
                    background: "#f0fdf4",
                    color: "#166534",
                    border: "1px solid #bbf7d0",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Add size={16} /> Add Degree
                </button>
              </div>

              {educations.map((edu, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "16px",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "#0f172a" }}>
                      Qualification #{idx + 1}
                    </span>
                    {educations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEducation(idx)}
                        style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}
                        title="Remove entry"
                      >
                        <Trash size={16} />
                      </button>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "12px" }}>
                    <div>
                      <label className={styles.formLabel}>Degree / Diploma *</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={edu.degree}
                        onChange={(e) => updateEducation(idx, "degree", e.target.value)}
                        placeholder="e.g. MBBS, MD, FRCP"
                        required
                      />
                    </div>
                    <div>
                      <label className={styles.formLabel}>Graduation Year</label>
                      <input
                        type="number"
                        className={styles.formInput}
                        value={edu.graduationYear || ""}
                        onChange={(e) => updateEducation(idx, "graduationYear", parseInt(e.target.value, 10) || null)}
                        placeholder="e.g. 2018"
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: "10px" }}>
                    <label className={styles.formLabel}>Institution / University *</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={edu.institution}
                      onChange={(e) => updateEducation(idx, "institution", e.target.value)}
                      placeholder="e.g. King Saud University"
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 4: Licenses */}
          {currentStep === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  Add your active medical registrations, clinical licenses, and health authority credentials.
                </span>
                <button
                  type="button"
                  onClick={addLicense}
                  style={{
                    background: "#f0fdf4",
                    color: "#166534",
                    border: "1px solid #bbf7d0",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Add size={16} /> Add License
                </button>
              </div>

              {licenses.map((lic, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "16px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "#0f172a" }}>
                      License #{idx + 1}
                    </span>
                    {licenses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLicense(idx)}
                        style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}
                        title="Remove entry"
                      >
                        <Trash size={16} />
                      </button>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: "12px" }}>
                    <div>
                      <label className={styles.formLabel}>License Type / Title *</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={lic.licenseType}
                        onChange={(e) => updateLicense(idx, "licenseType", e.target.value)}
                        placeholder="e.g. SCFHS Consultant"
                        required
                      />
                    </div>
                    <div>
                      <label className={styles.formLabel}>Registration Number *</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={lic.registrationNumber}
                        onChange={(e) => updateLicense(idx, "registrationNumber", e.target.value)}
                        placeholder="e.g. 2026-MED-88910"
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "12px", marginTop: "10px" }}>
                    <div>
                      <label className={styles.formLabel}>Issuing Authority *</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={lic.issuingAuthority}
                        onChange={(e) => updateLicense(idx, "issuingAuthority", e.target.value)}
                        placeholder="e.g. SCFHS Riyadh / DHA Dubai"
                        required
                      />
                    </div>
                    <div>
                      <label className={styles.formLabel}>Expiry Date</label>
                      <input
                        type="date"
                        className={styles.formInput}
                        value={lic.expiryDate || ""}
                        onChange={(e) => updateLicense(idx, "expiryDate", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 5: Work Experience */}
          {currentStep === 5 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  Record your past and current clinical practice postings and hospital appointments.
                </span>
                <button
                  type="button"
                  onClick={addExperience}
                  style={{
                    background: "#f0fdf4",
                    color: "#166534",
                    border: "1px solid #bbf7d0",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Add size={16} /> Add Experience
                </button>
              </div>

              {experiences.map((exp, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "16px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "#0f172a" }}>
                      Posting #{idx + 1}
                    </span>
                    {experiences.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExperience(idx)}
                        style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}
                        title="Remove entry"
                      >
                        <Trash size={16} />
                      </button>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: "12px" }}>
                    <div>
                      <label className={styles.formLabel}>Hospital / Healthcare Organization *</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={exp.organization}
                        onChange={(e) => updateExperience(idx, "organization", e.target.value)}
                        placeholder="e.g. King Faisal Specialist Hospital"
                        required
                      />
                    </div>
                    <div>
                      <label className={styles.formLabel}>Position Title *</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={exp.position}
                        onChange={(e) => updateExperience(idx, "position", e.target.value)}
                        placeholder="e.g. Consultant Cardiologist"
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: "12px", marginTop: "10px" }}>
                    <div>
                      <label className={styles.formLabel}>Start Date</label>
                      <input
                        type="date"
                        className={styles.formInput}
                        value={exp.startDate}
                        onChange={(e) => updateExperience(idx, "startDate", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={styles.formLabel}>End Date (leave blank if current)</label>
                      <input
                        type="date"
                        className={styles.formInput}
                        value={exp.endDate || ""}
                        onChange={(e) => updateExperience(idx, "endDate", e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: "10px" }}>
                    <label className={styles.formLabel}>Key Clinical Responsibilities</label>
                    <textarea
                      className={styles.formInput}
                      rows={2}
                      value={exp.responsibilities || ""}
                      onChange={(e) => updateExperience(idx, "responsibilities", e.target.value)}
                      placeholder="e.g. Catheterization lab lead, daily ICU rounds, inpatient clinic supervision..."
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 6: Languages & CV */}
          {currentStep === 6 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Languages Section */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label className={styles.formLabel} style={{ margin: 0 }}>
                    Spoken Languages &amp; Clinical Proficiency
                  </label>
                  <button
                    type="button"
                    onClick={addLanguage}
                    style={{
                      background: "#f0fdf4",
                      color: "#166534",
                      border: "1px solid #bbf7d0",
                      borderRadius: "6px",
                      padding: "4px 10px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Add size={14} /> Add Language
                  </button>
                </div>

                {languages.map((lang, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 1fr auto",
                      gap: "12px",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <input
                      type="text"
                      className={styles.formInput}
                      value={lang.language}
                      onChange={(e) => updateLanguage(idx, "language", e.target.value)}
                      placeholder="e.g. Arabic, English, French"
                    />
                    <select
                      className={styles.formInput}
                      value={lang.proficiency}
                      onChange={(e) => updateLanguage(idx, "proficiency", e.target.value)}
                    >
                      <option value="NATIVE">Native</option>
                      <option value="FLUENT">Fluent</option>
                      <option value="PROFESSIONAL">Professional</option>
                      <option value="BASIC">Basic</option>
                    </select>
                    {languages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLanguage(idx)}
                        style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}
                        title="Remove language"
                      >
                        <Trash size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* CV Upload Section */}
              <div
                style={{
                  border: "1px dashed #cbd5e1",
                  borderRadius: "12px",
                  padding: "24px",
                  textAlign: "center",
                  background: "#f8fafc",
                }}
              >
                <DocumentUpload size={36} color="#0284c7" style={{ margin: "0 auto 8px" }} />
                <h4 style={{ margin: "0 0 4px", fontSize: "15px", color: "#0a2647" }}>
                  Curriculum Vitae (CV) Document
                </h4>
                <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#64748b" }}>
                  {cvFileName ? (
                    <strong style={{ color: "#166534" }}>Current/Uploaded: {cvFileName}</strong>
                  ) : (
                    "Upload updated CV in PDF or DOCX format (Max 15MB)."
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => cvInputRef.current?.click()}
                  disabled={uploadingCv}
                  style={{
                    background: "#0284c7",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 18px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {uploadingCv ? "Uploading CV..." : "Upload Replacement CV"}
                </button>
                <input
                  ref={cvInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleCvUpload}
                  style={{ display: "none" }}
                />
                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px" }}>
                  Kept strictly private to platform administrators until candidate consent is granted.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
            paddingTop: "16px",
            borderTop: "1px solid #e2e8f0",
            flexShrink: 0,
          }}
        >
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className={styles.btnSecondary}
                disabled={submitting}
              >
                ← Back
              </button>
            )}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: "10px", marginLeft: "auto" }}>
            <button type="button" onClick={requestClose} className={styles.btnSecondary} disabled={submitting}>
              Cancel
            </button>
            {currentStep < 6 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                className={styles.btnSolidTeal}
                style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                Next Step <ArrowRight2 size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className={styles.btnSolidTeal}
                disabled={submitting || uploadingPhoto || uploadingCv}
              >
                {submitting ? "Submitting Request..." : "Submit Changes for Admin Review"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
