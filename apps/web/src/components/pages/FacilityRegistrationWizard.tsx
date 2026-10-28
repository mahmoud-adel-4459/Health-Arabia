"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeSlash, ArrowRight2, ArrowDown2 } from "iconsax-react";
import type { ManagedCity } from "@/lib/public-content";
import styles from "./pages.module.css";

const STEPS = [
  { id: 1, label: "Hospital Details" },
  { id: 2, label: "Officer information" },
  { id: 3, label: "Verification" },
];

const ORGANIZATION_TYPES = [
  { value: "GOVERNMENT", label: "Government Hospital" },
  { value: "MILITARY", label: "Military Healthcare" },
  { value: "UNIVERSITY", label: "University Medical Center" },
  { value: "PRIVATE", label: "Private Hospital" },
  { value: "CLINIC", label: "Clinic / Specialized Center" },
  { value: "OTHER", label: "Other Healthcare Entity" },
];

interface FacilityRegistrationWizardProps {
  initialCities?: ManagedCity[];
}

export function FacilityRegistrationWizard({ initialCities = [] }: FacilityRegistrationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [highestStep, setHighestStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Managed Cities list
  const [cities, setCities] = useState<ManagedCity[]>(initialCities);

  useEffect(() => {
    if (cities.length === 0) {
      fetch("/api/public/cities")
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.cities)) {
            setCities(data.cities);
          }
        })
        .catch(() => {});
    }
  }, [cities.length]);

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // File input ref for logo upload
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Hospital Details
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cityId, setCityId] = useState("");
  const [locationUrl, setLocationUrl] = useState("");
  const [address, setAddress] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [hospitalEmail, setHospitalEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [logoAssetId, setLogoAssetId] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState<string | null>(null);

  // Step 2: Officer Information
  const [officerName, setOfficerName] = useState("");
  const [officerEmail, setOfficerEmail] = useState("");
  const [officerPhoneCode, setOfficerPhoneCode] = useState("+966");
  const [officerPhoneNumber, setOfficerPhoneNumber] = useState("");
  const [organizationType, setOrganizationType] = useState("");
  const [message, setMessage] = useState("");

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file (PNG, JPG).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Logo size must not exceed 5MB.");
      return;
    }

    setUploadingLogo(true);
    setErrorMessage(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        setLogoPreview(base64Data);
        setLogoFileName(file.name);

        const res = await fetch("/api/files/upload-private", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type,
            base64Data,
            kind: "SUPPORTING_DOCUMENT",
          }),
        });

        const data = await res.json();
        if (res.ok && data.file?.id) {
          setLogoAssetId(data.file.id);
        } else {
          setErrorMessage(data.message || "Failed to upload logo.");
        }
        setUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setErrorMessage("Error uploading logo.");
      setUploadingLogo(false);
    }
  };

  const handleStep1Next = () => {
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Please enter the Hospital / Clinic Name.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter a password for your facility portal account.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setCurrentStep(2);
    setHighestStep((prev) => Math.max(prev, 2));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setErrorMessage(null);
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmitRegistration = async () => {
    setErrorMessage(null);

    if (!officerName.trim()) {
      setErrorMessage("Please enter the Recruitment Officer Name.");
      return;
    }

    if (!officerEmail.trim() || !officerEmail.includes("@")) {
      setErrorMessage("Please enter a valid Recruitment Officer Email (used for account login).");
      return;
    }

    if (!officerPhoneNumber.trim()) {
      setErrorMessage("Please enter the Recruitment Officer Phone Number.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        cityId: cityId || null,
        locationUrl: locationUrl.trim() || null,
        address: address.trim() || null,
        employeeCount: employeeCount.trim() || null,
        hospitalEmail: hospitalEmail.trim() || null,
        password,
        confirmPassword,
        officerName: officerName.trim(),
        officerEmail: officerEmail.trim(),
        officerPhoneCountryCode: officerPhoneCode,
        officerPhone: `${officerPhoneCode} ${officerPhoneNumber.trim()}`,
        organizationType: organizationType || null,
        message: message.trim() || null,
        logoAssetId: logoAssetId || null,
      };

      const res = await fetch("/api/auth/register/facility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      setLoading(false);
      setShowSuccessModal(true);
    } catch {
      setErrorMessage("A network error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      <section className={styles.wizardStepperContainer} aria-label="Progress">
        <div className={styles.wizardStepperInner}>
          {STEPS.map((step, idx) => {
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;
            const isAccessible = step.id <= highestStep;

            return (
              <div key={step.id} style={{ display: "contents" }}>
                <div
                  className={styles.stepperItem}
                  onClick={() => isAccessible && setCurrentStep(step.id)}
                  role="button"
                  tabIndex={0}
                  aria-current={isActive ? "step" : undefined}
                  style={{ cursor: isAccessible ? "pointer" : "default" }}
                >
                  <div
                    className={`${styles.stepperNumber} ${
                      isCompleted
                        ? styles.stepperNumberCompleted
                        : isActive
                        ? styles.stepperNumberActive
                        : styles.stepperNumberInactive
                    }`}
                  >
                    {isCompleted ? "✓" : step.id}
                  </div>
                  <span
                    className={`${styles.stepperLabel} ${
                      isActive ? styles.stepperLabelActive : styles.stepperLabelInactive
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {idx < STEPS.length - 1 ? (
                  <div
                    className={`${styles.stepperLine} ${
                      currentStep > step.id ? styles.stepperLineCompleted : styles.stepperLineInactive
                    }`}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <main className={styles.wizardPageWrapper}>
        <div className={styles.wizardContainer}>
          <div className={styles.wizardHeaderBlock}>
            <h1 className={styles.wizardTitle}>
              {currentStep === 1 ? "Hospital Information" : "Recruitment Officer information"}
            </h1>
            <p className={styles.wizardSubtitle}>
              {currentStep === 1
                ? "Tell us about yourself to customize your clinical placement preferences"
                : "Who should we reach out to regarding applications and updates?"}
            </p>
          </div>

          <div className={styles.wizardCard}>
            {errorMessage ? (
              <div
                style={{
                  backgroundColor: "#fee2e2",
                  color: "#dc2626",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  marginBottom: "20px",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                {errorMessage}
              </div>
            ) : null}

            {/* STEP 1: Hospital Details (Matching Figma 418:5025) */}
            {currentStep === 1 && (
              <div>
                <div className={styles.wizardFormGroup}>
                  <label htmlFor="facility-name" className={styles.wizardLabel}>
                    Hospital/Clinc Name <span style={{ color: "#e02d3c" }}>*</span>
                  </label>
                  <input
                    id="facility-name"
                    type="text"
                    className={styles.wizardInput}
                    placeholder="Hospital/Clinc Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.wizardFormGroup}>
                  <label className={styles.wizardLabel}>Upload Logo (Optional)</label>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    style={{ display: "none" }}
                    onChange={handleLogoFileChange}
                  />
                  <div
                    className={styles.cvDropArea}
                    onClick={() => logoInputRef.current?.click()}
                    style={{ padding: "32px 16px" }}
                  >
                    {logoPreview ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: "16px",
                            overflow: "hidden",
                            position: "relative",
                            border: "1px solid #e7e9ed",
                            backgroundColor: "#ffffff",
                          }}
                        >
                          <Image src={logoPreview} alt="Logo preview" fill style={{ objectFit: "contain", padding: 6 }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#1B8A8A" }}>
                          {logoFileName || "Logo uploaded successfully"}
                        </span>
                        <span style={{ fontSize: 12, color: "#5b6e84" }}>Click to replace logo</span>
                      </div>
                    ) : (
                      <>
                        <div className={styles.cvDropIcon}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 17V11L7 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M9 11L11 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M22 10V15C22 20 20 22 15 22H9C4 22 2 20 2 15V9C2 4 4 2 9 2H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M22 10H18C15 10 14 9 14 6V2L22 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div className={styles.cvDropTitle}>
                          {uploadingLogo ? "Uploading Logo..." : "Drag & drop your logo here or click to browse"}
                        </div>
                        <div className={styles.cvDropSubtitle}>PNG, JPG. Max 5MB. Clear background preferred.</div>
                      </>
                    )}
                  </div>
                </div>

                <div className={styles.wizardFormGroup}>
                  <label htmlFor="facility-description" className={styles.wizardLabel}>
                    Hospital Details
                  </label>
                  <textarea
                    id="facility-description"
                    className={styles.wizardTextarea}
                    placeholder="Hospital Details"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className={styles.wizardFormGroup}>
                  <label htmlFor="facility-city" className={styles.wizardLabel}>
                    City
                  </label>
                  <div style={{ position: "relative" }}>
                    <select
                      id="facility-city"
                      className={styles.wizardSelect}
                      value={cityId}
                      onChange={(e) => setCityId(e.target.value)}
                      style={{
                        appearance: "none",
                        WebkitAppearance: "none",
                        paddingRight: 40,
                        cursor: "pointer",
                      }}
                    >
                      <option value="">Select City</option>
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.displayName || c.nameEn}
                        </option>
                      ))}
                    </select>
                    <div
                      style={{
                        position: "absolute",
                        right: 14,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#8e9baa",
                        pointerEvents: "none",
                      }}
                    >
                      <ArrowDown2 size={18} color="currentColor" variant="Outline" />
                    </div>
                  </div>
                </div>

                <div className={styles.wizardFormGroup}>
                  <label htmlFor="facility-location-url" className={styles.wizardLabel}>
                    Location URL
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="facility-location-url"
                      type="url"
                      className={styles.wizardInput}
                      placeholder="Location URL"
                      value={locationUrl}
                      onChange={(e) => setLocationUrl(e.target.value)}
                      style={{ paddingRight: 40 }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        right: 14,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#8e9baa",
                        pointerEvents: "none",
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className={styles.wizardFormGroup}>
                  <label htmlFor="facility-address" className={styles.wizardLabel}>
                    Location
                  </label>
                  <textarea
                    id="facility-address"
                    className={styles.wizardTextarea}
                    placeholder="Location Details"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className={styles.wizardFormGroup}>
                  <label htmlFor="facility-employees" className={styles.wizardLabel}>
                    No. of Employees
                  </label>
                  <input
                    id="facility-employees"
                    type="text"
                    className={styles.wizardInput}
                    placeholder="e.g. 250"
                    value={employeeCount}
                    onChange={(e) => setEmployeeCount(e.target.value)}
                  />
                </div>

                <div className={styles.wizardFormGroup}>
                  <label htmlFor="facility-email" className={styles.wizardLabel}>
                    Hospital Email
                  </label>
                  <input
                    id="facility-email"
                    type="email"
                    className={styles.wizardInput}
                    placeholder="Hospital@email.com"
                    value={hospitalEmail}
                    onChange={(e) => setHospitalEmail(e.target.value)}
                  />
                </div>

                {/* Password & Confirm Password matching Figma 418:5025 */}
                <div className={styles.wizardTwoCol}>
                  <div className={styles.wizardFormGroup}>
                    <label htmlFor="facility-password" className={styles.wizardLabel}>
                      Password <span style={{ color: "#e02d3c" }}>*</span>
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        id="facility-password"
                        type={showPassword ? "text" : "password"}
                        className={styles.wizardInput}
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ paddingRight: 40 }}
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute",
                          right: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          color: "#8e9baa",
                          cursor: "pointer",
                        }}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeSlash size={20} color="currentColor" /> : <Eye size={20} color="currentColor" />}
                      </button>
                    </div>
                  </div>

                  <div className={styles.wizardFormGroup}>
                    <label htmlFor="facility-confirm-password" className={styles.wizardLabel}>
                      Confirm Password <span style={{ color: "#e02d3c" }}>*</span>
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        id="facility-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        className={styles.wizardInput}
                        placeholder="••••••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        style={{ paddingRight: 40 }}
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{
                          position: "absolute",
                          right: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          color: "#8e9baa",
                          cursor: "pointer",
                        }}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeSlash size={20} color="currentColor" /> : <Eye size={20} color="currentColor" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className={styles.wizardActionsRow}>
                  <button
                    type="button"
                    className={styles.wizardNextBtn}
                    onClick={handleStep1Next}
                    style={{ marginLeft: "auto" }}
                  >
                    <span>Save &amp; Continue</span>
                    <ArrowRight2 size={18} color="currentColor" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Officer Information (Matching Figma 419:5243) */}
            {currentStep === 2 && (
              <div>
                <div className={styles.wizardFormGroup}>
                  <label htmlFor="officer-name" className={styles.wizardLabel}>
                    Recruitment Officer Name <span style={{ color: "#e02d3c" }}>*</span>
                  </label>
                  <input
                    id="officer-name"
                    type="text"
                    className={styles.wizardInput}
                    placeholder="Rana Essawi"
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.wizardFormGroup}>
                  <label htmlFor="officer-email" className={styles.wizardLabel}>
                    Recruitment Officer Email (Login Email) <span style={{ color: "#e02d3c" }}>*</span>
                  </label>
                  <input
                    id="officer-email"
                    type="email"
                    className={styles.wizardInput}
                    placeholder="rana@email.com"
                    value={officerEmail}
                    onChange={(e) => setOfficerEmail(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.wizardFormGroup}>
                  <label htmlFor="officer-phone" className={styles.wizardLabel}>
                    Recruitment Officer Phone Number <span style={{ color: "#e02d3c" }}>*</span>
                  </label>
                  <div className={styles.wizardPhoneGroup}>
                    <select
                      className={`${styles.wizardSelect} ${styles.wizardPhoneCode}`}
                      value={officerPhoneCode}
                      onChange={(e) => setOfficerPhoneCode(e.target.value)}
                      aria-label="Country code"
                    >
                      <option value="+966">+966 (KSA)</option>
                      <option value="+971">+971 (UAE)</option>
                      <option value="+974">+974 (Qatar)</option>
                      <option value="+973">+973 (Bahrain)</option>
                      <option value="+965">+965 (Kuwait)</option>
                      <option value="+968">+968 (Oman)</option>
                      <option value="+44">+44 (UK)</option>
                      <option value="+20">+20 (Egypt)</option>
                    </select>
                    <input
                      id="officer-phone"
                      type="tel"
                      className={`${styles.wizardInput} ${styles.wizardPhoneInput}`}
                      placeholder="7700 900077"
                      value={officerPhoneNumber}
                      onChange={(e) => setOfficerPhoneNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className={styles.wizardFormGroup}>
                  <label htmlFor="organization-type" className={styles.wizardLabel}>
                    Organization Type
                  </label>
                  <select
                    id="organization-type"
                    className={styles.wizardSelect}
                    value={organizationType}
                    onChange={(e) => setOrganizationType(e.target.value)}
                  >
                    <option value="">Select Organization Type</option>
                    {ORGANIZATION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.wizardFormGroup}>
                  <label htmlFor="officer-message" className={styles.wizardLabel}>
                    Message
                  </label>
                  <textarea
                    id="officer-message"
                    className={styles.wizardTextarea}
                    placeholder="Tell us about roles you need"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className={styles.wizardActionsRow}>
                  <button type="button" className={styles.wizardBackBtn} onClick={handleBack}>
                    Back
                  </button>
                  <button
                    type="button"
                    className={styles.wizardNextBtn}
                    onClick={handleSubmitRegistration}
                    disabled={loading}
                  >
                    <span>{loading ? "Submitting..." : "Send Inquiry"}</span>
                    <ArrowRight2 size={18} color="currentColor" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Completion Modal matching Figma Frame 473:2743 */}
      {showSuccessModal ? (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalIconCircle}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="#1B8A8A" strokeWidth="2" />
                <polyline points="12 6 12 12 16 14" stroke="#1B8A8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className={styles.modalHeading}>Sent Successfully</h2>
            <p className={styles.modalBodyText}>
              Thank you for submitting your information. We will contact you soon.
            </p>
            <Link
              href="/login/facility"
              className={styles.modalActionBtn}
              style={{ display: "block", textDecoration: "none" }}
            >
              Got It
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
