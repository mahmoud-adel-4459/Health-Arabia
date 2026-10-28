"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeSlash, ArrowRight2 } from "iconsax-react";
import styles from "./pages.module.css";

interface EducationEntry {
  degree: string;
  institution: string;
  graduationYear?: number;
  isPrimary?: boolean;
}

interface LicenseEntry {
  licenseType: string;
  registrationNumber: string;
  issuingAuthority: string;
  expiryDate?: string;
}

interface ExperienceEntry {
  organization: string;
  position: string;
  startDate?: string;
  endDate?: string;
  responsibilities?: string;
}

const STEPS = [
  { id: 1, label: "Personal Info" },
  { id: 2, label: "Professional Info" },
  { id: 3, label: "Education" },
  { id: 4, label: "Licenses" },
  { id: 5, label: "Experience" },
  { id: 6, label: "CV Upload" },
];

const GCC_COUNTRIES = [
  "Saudi Arabia",
  "United Arab Emirates",
  "Qatar",
  "Bahrain",
  "Kuwait",
  "Oman",
];

export function DoctorRegistrationWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [highestStep, setHighestStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // File input refs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Personal Info state
  const [fullName, setFullName] = useState("Dr. Sarah Ahmed");
  const [email, setEmail] = useState("doctor.sarah@healtharabia.com");
  const [dateOfBirth, setDateOfBirth] = useState("15/04/1988");
  const [residenceCountry, setResidenceCountry] = useState("United Kingdom");
  const [phoneCode, setPhoneCode] = useState("+44");
  const [phoneNumber, setPhoneNumber] = useState("7700 900077");
  const [password, setPassword] = useState("SecretPassword123!");
  const [confirmPassword, setConfirmPassword] = useState("SecretPassword123!");
  const [photoAssetId, setPhotoAssetId] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Step 2: Professional Info state
  const [jobTitle, setJobTitle] = useState("Consultant Cardiologist");
  const [specialty, setSpecialty] = useState("Cardiology");
  const [about, setAbout] = useState(
    "Board-certified Consultant Cardiologist with over 8 years of specialized practice in clinical and interventional cardiology."
  );
  const [yearsOfExperience, setYearsOfExperience] = useState("8");
  const [currentPosition, setCurrentPosition] = useState("Head of Department");
  const [preferredCountries, setPreferredCountries] = useState<string[]>([
    "Saudi Arabia",
    "United Arab Emirates",
    "Qatar",
  ]);

  // Step 3: Education state
  const [educations, setEducations] = useState<EducationEntry[]>([
    {
      degree: "MBBS — Bachelor of Medicine",
      institution: "University of London",
      graduationYear: 2018,
      isPrimary: true,
    },
  ]);
  const [newDegree, setNewDegree] = useState("MD / PhD / Fellowship");
  const [newSchool, setNewSchool] = useState("Royal College of Physicians");
  const [newGradYear, setNewGradYear] = useState("2022");

  // Step 4: Licenses state
  const [licenses, setLicenses] = useState<LicenseEntry[]>([
    {
      licenseType: "Saudi Commission for Health Specialties (SCFHS)",
      registrationNumber: "REG-2026-9938210",
      issuingAuthority: "SCFHS Riyadh",
      expiryDate: "12/12/2028",
    },
  ]);
  const [newLicType, setNewLicType] = useState("Dubai Health Authority (DHA)");
  const [newLicNumber, setNewLicNumber] = useState("DHA-2026-77382");
  const [newLicAuthority, setNewLicAuthority] = useState("DHA Dubai");
  const [newLicExpiry, setNewLicExpiry] = useState("10/10/2027");

  // Step 5: Experience state
  const [experiences, setExperiences] = useState<ExperienceEntry[]>([
    {
      organization: "King Faisal Specialist Hospital",
      position: "Consultant Cardiologist",
      startDate: "01/01/2019",
      endDate: "01/01/2026",
      responsibilities:
        "Consultant in interventional cardiology, cardiac catheterization, and clinical department supervision.",
    },
  ]);
  const [newOrg, setNewOrg] = useState("Hammersmith Hospital");
  const [newPos, setNewPos] = useState("Senior Registrar");
  const [newStartDate, setNewStartDate] = useState("01/01/2015");
  const [newEndDate, setNewEndDate] = useState("31/12/2018");
  const [newResp, setNewResp] = useState("Cardiology registrar in NHS trust.");

  // Step 6: CV state
  const [cvAssetId, setCvAssetId] = useState<string | null>(null);
  const [cvFileName, setCvFileName] = useState<string | null>("CV_Dr_Sarah_Ahmed.pdf");
  const [cvFileSize, setCvFileSize] = useState<string | null>("2.4 MB • Uploaded successfully");

  // Toggle preferred country tag
  const toggleCountryTag = (country: string) => {
    setPreferredCountries((prev) =>
      prev.includes(country) ? prev.filter((c) => c !== country) : [...prev, country]
    );
  };

  // Upload private photo handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file (JPG or PNG).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Image exceeds 5MB size limit.");
      return;
    }

    setUploadingPhoto(true);
    setErrorMessage(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        setPhotoPreview(base64Data);

        const res = await fetch("/api/files/upload-private", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
          setErrorMessage(data.message || "Failed to upload photo.");
        }
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setErrorMessage("Error processing image upload.");
      setUploadingPhoto(false);
    }
  };

  // Upload private CV handler
  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("CV file exceeds 10MB limit.");
      return;
    }

    setUploadingCv(true);
    setErrorMessage(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const res = await fetch("/api/files/upload-private", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
          const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
          setCvFileSize(`${sizeMb} MB • Uploaded successfully`);
        } else {
          setErrorMessage(data.message || "Failed to upload CV.");
        }
        setUploadingCv(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setErrorMessage("Error processing CV upload.");
      setUploadingCv(false);
    }
  };

  // Step 1 Validation
  const validateStep1 = () => {
    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name as shown in passport.");
      return false;
    }
    if (!phoneNumber.trim()) {
      setErrorMessage("Please enter your mobile phone number.");
      return false;
    }
    if (!password) {
      setErrorMessage("Please enter a password.");
      return false;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return false;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return false;
    }
    return true;
  };

  // Navigation handlers
  const handleNext = () => {
    setErrorMessage(null);
    if (currentStep === 1) {
      if (!validateStep1()) return;
    }

    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    if (nextStep > highestStep) {
      setHighestStep(nextStep);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setErrorMessage(null);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Submit complete registration
  const handleSubmitRegistration = async () => {
    setLoading(true);
    setErrorMessage(null);

    const fullMobile = `${phoneCode}${phoneNumber.replace(/\s+/g, "")}`;

    const payload = {
      fullName: fullName.trim(),
      mobileE164: fullMobile,
      email: email.trim() || undefined,
      password,
      dateOfBirth,
      residenceCountry,
      photoAssetId,
      jobTitle,
      primarySpecialty: specialty,
      about,
      yearsOfExperience: parseInt(yearsOfExperience, 10) || 8,
      currentPosition,
      preferredCountries,
      educations,
      licenses,
      experiences,
      cvAssetId,
    };

    try {
      const res = await fetch("/api/auth/register/doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || "Registration failed. Please check your details.");
        setLoading(false);
        return;
      }

      setLoading(false);
      setShowSuccessModal(true);
    } catch {
      setErrorMessage("Network error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      {/* Stepper Bar matching Figma Frames */}
      <section className={styles.wizardStepperContainer}>
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

      {/* Main Wizard Form Body */}
      <main className={styles.wizardPageWrapper}>
        <div className={styles.wizardContainer}>
          {/* Header Block based on active step */}
          <div className={styles.wizardHeaderBlock}>
            {currentStep === 1 && (
              <>
                <h1 className={styles.wizardTitle}>Personal Information</h1>
                <p className={styles.wizardSubtitle}>
                  Tell us about yourself to customize your clinical placement preferences
                </p>
              </>
            )}
            {currentStep === 2 && (
              <>
                <h1 className={styles.wizardTitle}>Professional Information</h1>
                <p className={styles.wizardSubtitle}>
                  Share your clinical expertise and target destinations
                </p>
              </>
            )}
            {currentStep === 3 && (
              <>
                <h1 className={styles.wizardTitle}>Education &amp; Qualifications</h1>
                <p className={styles.wizardSubtitle}>
                  Add your academic qualifications starting with your primary medical degree
                </p>
              </>
            )}
            {currentStep === 4 && (
              <>
                <h1 className={styles.wizardTitle}>Licenses &amp; Certifications</h1>
                <p className={styles.wizardSubtitle}>
                  Add active clinical practice licenses and registrations (SCFHS, DHCC, etc.)
                </p>
              </>
            )}
            {currentStep === 5 && (
              <>
                <h1 className={styles.wizardTitle}>Work Experience</h1>
                <p className={styles.wizardSubtitle}>
                  Add your professional history to showcase your clinical background
                </p>
              </>
            )}
            {currentStep === 6 && (
              <>
                <h1 className={styles.wizardTitle}>CV</h1>
                <p className={styles.wizardSubtitle}>
                  Upload your professional curriculum vitae to complete your application
                </p>
              </>
            )}
          </div>

          {/* Form Card */}
          <div className={styles.wizardCard}>
            {errorMessage ? (
              <div
                style={{
                  backgroundColor: "#FEE2E2",
                  color: "#991B1B",
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

            {/* STEP 1: Personal Info */}
            {currentStep === 1 && (
              <div>
                {/* Profile Photo Row */}
                <div className={styles.photoUploadRow}>
                  <input
                    type="file"
                    ref={photoInputRef}
                    style={{ display: "none" }}
                    accept="image/jpeg,image/png"
                    onChange={handlePhotoUpload}
                  />
                  <div
                    className={styles.photoAvatarBox}
                    onClick={() => photoInputRef.current?.click()}
                    title="Click to upload clinical portrait"
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="Portrait" className={styles.photoAvatarImg} />
                    ) : (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 10C10.1046 10 11 9.10457 11 8C11 6.89543 10.1046 6 9 6C7.89543 6 7 6.89543 7 8C7 9.10457 7.89543 10 9 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2.67 18.95L7.6 15.64C8.39 15.11 9.53 15.17 10.24 15.78L10.57 16.07C11.35 16.74 12.61 16.74 13.39 16.07L17.55 12.5C18.33 11.83 19.59 11.83 20.37 12.5L22 13.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <div className={styles.photoUploadText}>
                    <h3>Profile Photograph</h3>
                    <p>
                      {uploadingPhoto
                        ? "Uploading photo..."
                        : "Please upload a professional clinical portrait (JPG, PNG. Max 5MB)"}
                    </p>
                  </div>
                </div>

                <div className={styles.wizardFormGroup}>
                  <label className={styles.wizardLabel}>Full Name (As shown in Passport)</label>
                  <input
                    type="text"
                    className={styles.wizardInput}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. Sarah Ahmed"
                    required
                  />
                </div>

                <div className={styles.wizardFormGroup}>
                  <label className={styles.wizardLabel}>
                    Email <span style={{ color: "#8E9BAA", fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    type="email"
                    className={styles.wizardInput}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor.sarah@healtharabia.com"
                  />
                </div>

                <div className={styles.wizardFormGroup}>
                  <label className={styles.wizardLabel}>Date of Birth</label>
                  <input
                    type="text"
                    className={styles.wizardInput}
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    placeholder="DD / MM / YYYY"
                  />
                </div>

                <div className={styles.wizardFormGroup}>
                  <label className={styles.wizardLabel}>Current Country of Residence</label>
                  <select
                    className={styles.wizardSelect}
                    value={residenceCountry}
                    onChange={(e) => setResidenceCountry(e.target.value)}
                  >
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Saudi Arabia">Saudi Arabia</option>
                    <option value="United Arab Emirates">United Arab Emirates</option>
                    <option value="Qatar">Qatar</option>
                    <option value="Bahrain">Bahrain</option>
                    <option value="Kuwait">Kuwait</option>
                    <option value="Oman">Oman</option>
                    <option value="Egypt">Egypt</option>
                    <option value="Jordan">Jordan</option>
                    <option value="India">India</option>
                    <option value="Pakistan">Pakistan</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className={styles.wizardFormGroup}>
                  <label className={styles.wizardLabel}>Phone Number (Primary Login)</label>
                  <div className={styles.wizardPhoneGroup}>
                    <select
                      className={`${styles.wizardSelect} ${styles.wizardPhoneCode}`}
                      value={phoneCode}
                      onChange={(e) => setPhoneCode(e.target.value)}
                    >
                      <option value="+44">+44 (UK)</option>
                      <option value="+966">+966 (KSA)</option>
                      <option value="+971">+971 (UAE)</option>
                      <option value="+974">+974 (QAT)</option>
                      <option value="+965">+965 (KWT)</option>
                      <option value="+968">+968 (OMN)</option>
                      <option value="+973">+973 (BHR)</option>
                      <option value="+20">+20 (EGY)</option>
                    </select>
                    <input
                      type="tel"
                      className={`${styles.wizardInput} ${styles.wizardPhoneInput}`}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="7700 900077"
                      required
                    />
                  </div>
                </div>

                {/* Password Fields matching updated Figma */}
                <div className={`${styles.wizardFormGroup} ${styles.wizardTwoCol}`}>
                  <div>
                    <label className={styles.wizardLabel}>Password</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showPassword ? "text" : "password"}
                        className={styles.wizardInput}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#8E9BAA",
                        }}
                      >
                        {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={styles.wizardLabel}>Confirm Password</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        className={styles.wizardInput}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#8E9BAA",
                        }}
                      >
                        {showConfirmPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className={styles.wizardActionsRow}>
                  <button type="button" className={styles.wizardNextBtn} onClick={handleNext}>
                    <span>Save &amp; Continue</span>
                    <ArrowRight2 size={18} color="currentColor" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Professional Info */}
            {currentStep === 2 && (
              <div>
                <div className={styles.wizardFormGroup}>
                  <label className={styles.wizardLabel}>Job Title</label>
                  <input
                    type="text"
                    className={styles.wizardInput}
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Consultant Cardiologist"
                  />
                </div>

                <div className={styles.wizardFormGroup}>
                  <label className={styles.wizardLabel}>Medical Specialty</label>
                  <select
                    className={styles.wizardSelect}
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="Paediatrics & ICU">Paediatrics &amp; ICU</option>
                    <option value="Radiology">Radiology</option>
                    <option value="Internal Medicine">Internal Medicine</option>
                    <option value="Surgery">Surgery</option>
                    <option value="Anaesthetics">Anaesthetics</option>
                  </select>
                </div>

                <div className={styles.wizardFormGroup}>
                  <label className={styles.wizardLabel}>About You</label>
                  <textarea
                    className={styles.wizardTextarea}
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    placeholder="Board-certified Consultant Cardiologist with over 8 years of specialized practice in clinical and interventional cardiology."
                  />
                </div>

                <div className={`${styles.wizardFormGroup} ${styles.wizardTwoCol}`}>
                  <div>
                    <label className={styles.wizardLabel}>Years of Experience</label>
                    <select
                      className={styles.wizardSelect}
                      value={yearsOfExperience}
                      onChange={(e) => setYearsOfExperience(e.target.value)}
                    >
                      <option value="1">1 year</option>
                      <option value="2">2 years</option>
                      <option value="3">3 years</option>
                      <option value="5">5+ years</option>
                      <option value="8">8+ years</option>
                      <option value="10">10+ years</option>
                    </select>
                  </div>
                  <div>
                    <label className={styles.wizardLabel}>Current Position</label>
                    <input
                      type="text"
                      className={styles.wizardInput}
                      value={currentPosition}
                      onChange={(e) => setCurrentPosition(e.target.value)}
                      placeholder="Head of Department"
                    />
                  </div>
                </div>

                <div className={styles.wizardFormGroup}>
                  <label className={styles.wizardLabel}>
                    Preferred Countries (GCC Destination Tags)
                  </label>
                  <div className={styles.countryPillsWrap}>
                    {GCC_COUNTRIES.map((country) => {
                      const isSelected = preferredCountries.includes(country);
                      return (
                        <button
                          key={country}
                          type="button"
                          className={`${styles.countryPill} ${
                            isSelected ? styles.countryPillSelected : ""
                          }`}
                          onClick={() => toggleCountryTag(country)}
                        >
                          <span>{country}</span>
                          {isSelected ? <span>✓</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.wizardActionsRow}>
                  <button type="button" className={styles.wizardBackBtn} onClick={handleBack}>
                    Back
                  </button>
                  <button type="button" className={styles.wizardNextBtn} onClick={handleNext}>
                    <span>Save &amp; Continue</span>
                    <ArrowRight2 size={18} color="currentColor" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Education & Qualifications */}
            {currentStep === 3 && (
              <div>
                {/* Saved Education Items */}
                {educations.map((edu, idx) => (
                  <div key={idx} className={styles.educationItemCard}>
                    <div>
                      <div className={styles.educationItemDegree}>{edu.degree}</div>
                      <div className={styles.educationItemSchool}>
                        {edu.institution} {edu.graduationYear ? `- Graduated: ${edu.graduationYear}` : ""}
                      </div>
                    </div>
                    {edu.isPrimary ? (
                      <span className={styles.primaryDegreeBadge}>Primary Degree</span>
                    ) : null}
                  </div>
                ))}

                <div className={styles.wizardFormGroup}>
                  <label className={styles.wizardLabel}>Degree / Qualification</label>
                  <select
                    className={styles.wizardSelect}
                    value={newDegree}
                    onChange={(e) => setNewDegree(e.target.value)}
                  >
                    <option value="MD / PhD / Fellowship">MD / PhD / Fellowship</option>
                    <option value="MBBS — Bachelor of Medicine">MBBS — Bachelor of Medicine</option>
                    <option value="Master of Science (MSc)">Master of Science (MSc)</option>
                    <option value="Board Certification">Board Certification</option>
                    <option value="Diploma of Specialization">Diploma of Specialization</option>
                  </select>
                </div>

                <div className={styles.wizardFormGroup}>
                  <label className={styles.wizardLabel}>University / Medical School</label>
                  <input
                    type="text"
                    className={styles.wizardInput}
                    value={newSchool}
                    onChange={(e) => setNewSchool(e.target.value)}
                    placeholder="e.g. Royal College of Physicians"
                  />
                </div>

                <div className={styles.wizardFormGroup}>
                  <label className={styles.wizardLabel}>Graduation Year</label>
                  <select
                    className={styles.wizardSelect}
                    value={newGradYear}
                    onChange={(e) => setNewGradYear(e.target.value)}
                  >
                    {Array.from({ length: 40 }, (_, i) => 2026 - i).map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className={styles.addLinkBtn}
                  onClick={() => {
                    if (newDegree && newSchool) {
                      setEducations([
                        ...educations,
                        {
                          degree: newDegree,
                          institution: newSchool,
                          graduationYear: parseInt(newGradYear, 10),
                          isPrimary: false,
                        },
                      ]);
                      setNewSchool("");
                    }
                  }}
                >
                  + Add Another Degree or Qualification
                </button>

                <div className={styles.wizardActionsRow}>
                  <button type="button" className={styles.wizardBackBtn} onClick={handleBack}>
                    Back
                  </button>
                  <button type="button" className={styles.wizardNextBtn} onClick={handleNext}>
                    <span>Save &amp; Continue</span>
                    <ArrowRight2 size={18} color="currentColor" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Licenses & Certifications */}
            {currentStep === 4 && (
              <div>
                <div className={styles.wizardFormGroup}>
                  <label className={styles.wizardLabel}>License Type</label>
                  <select
                    className={styles.wizardSelect}
                    value={newLicType}
                    onChange={(e) => setNewLicType(e.target.value)}
                  >
                    <option value="Saudi Commission for Health Specialties (SCFHS)">
                      Saudi Commission for Health Specialties (SCFHS)
                    </option>
                    <option value="Dubai Health Authority (DHA)">
                      Dubai Health Authority (DHA)
                    </option>
                    <option value="Department of Health Abu Dhabi (DOH)">
                      Department of Health Abu Dhabi (DOH)
                    </option>
                    <option value="General Medical Council (GMC)">
                      General Medical Council (GMC)
                    </option>
                    <option value="Other National License">Other National Medical Council</option>
                  </select>
                </div>

                <div className={styles.wizardFormGroup}>
                  <label className={styles.wizardLabel}>License / Registration Number</label>
                  <input
                    type="text"
                    className={styles.wizardInput}
                    value={newLicNumber}
                    onChange={(e) => setNewLicNumber(e.target.value)}
                    placeholder="REG-2026-9938210"
                  />
                </div>

                <div className={`${styles.wizardFormGroup} ${styles.wizardTwoCol}`}>
                  <div>
                    <label className={styles.wizardLabel}>Issuing Authority</label>
                    <input
                      type="text"
                      className={styles.wizardInput}
                      value={newLicAuthority}
                      onChange={(e) => setNewLicAuthority(e.target.value)}
                      placeholder="SCFHS Riyadh"
                    />
                  </div>
                  <div>
                    <label className={styles.wizardLabel}>Expiry Date</label>
                    <input
                      type="text"
                      className={styles.wizardInput}
                      value={newLicExpiry}
                      onChange={(e) => setNewLicExpiry(e.target.value)}
                      placeholder="DD / MM / YYYY"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.addLinkBtn}
                  onClick={() => {
                    if (newLicNumber && newLicAuthority) {
                      setLicenses([
                        ...licenses,
                        {
                          licenseType: newLicType,
                          registrationNumber: newLicNumber,
                          issuingAuthority: newLicAuthority,
                          expiryDate: newLicExpiry,
                        },
                      ]);
                      setNewLicNumber("");
                    }
                  }}
                >
                  + Add Another License or Certification
                </button>

                <div className={styles.wizardActionsRow}>
                  <button type="button" className={styles.wizardBackBtn} onClick={handleBack}>
                    Back
                  </button>
                  <button type="button" className={styles.wizardNextBtn} onClick={handleNext}>
                    <span>Save &amp; Continue</span>
                    <ArrowRight2 size={18} color="currentColor" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: Work Experience */}
            {currentStep === 5 && (
              <div>
                <div className={styles.wizardFormGroup}>
                  <label className={styles.wizardLabel}>Hospital / Organization</label>
                  <input
                    type="text"
                    className={styles.wizardInput}
                    value={newOrg}
                    onChange={(e) => setNewOrg(e.target.value)}
                    placeholder="Saudi Commission for Health Specialties (SCFHS)"
                  />
                </div>

                <div className={styles.wizardFormGroup}>
                  <label className={styles.wizardLabel}>Position / Title</label>
                  <input
                    type="text"
                    className={styles.wizardInput}
                    value={newPos}
                    onChange={(e) => setNewPos(e.target.value)}
                    placeholder="e.g. Consultant Cardiologist"
                  />
                </div>

                <div className={`${styles.wizardFormGroup} ${styles.wizardTwoCol}`}>
                  <div>
                    <label className={styles.wizardLabel}>Start Date</label>
                    <input
                      type="text"
                      className={styles.wizardInput}
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                      placeholder="DD / MM / YYYY"
                    />
                  </div>
                  <div>
                    <label className={styles.wizardLabel}>End Date</label>
                    <input
                      type="text"
                      className={styles.wizardInput}
                      value={newEndDate}
                      onChange={(e) => setNewEndDate(e.target.value)}
                      placeholder="DD / MM / YYYY"
                    />
                  </div>
                </div>

                <div className={styles.wizardFormGroup}>
                  <label className={styles.wizardLabel}>Key Responsibilities</label>
                  <textarea
                    className={styles.wizardTextarea}
                    value={newResp}
                    onChange={(e) => setNewResp(e.target.value)}
                    placeholder="Describe your clinical duties, procedures performed, and key achievements..."
                  />
                </div>

                <button
                  type="button"
                  className={styles.addLinkBtn}
                  onClick={() => {
                    if (newOrg && newPos) {
                      setExperiences([
                        ...experiences,
                        {
                          organization: newOrg,
                          position: newPos,
                          startDate: newStartDate,
                          endDate: newEndDate,
                          responsibilities: newResp,
                        },
                      ]);
                      setNewOrg("");
                    }
                  }}
                >
                  + Add Another Experience
                </button>

                <div className={styles.wizardActionsRow}>
                  <button type="button" className={styles.wizardBackBtn} onClick={handleBack}>
                    Back
                  </button>
                  <button type="button" className={styles.wizardNextBtn} onClick={handleNext}>
                    <span>Save &amp; Continue</span>
                    <ArrowRight2 size={18} color="currentColor" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 6: CV Upload */}
            {currentStep === 6 && (
              <div>
                <input
                  type="file"
                  ref={cvInputRef}
                  style={{ display: "none" }}
                  accept=".pdf,.doc,.docx"
                  onChange={handleCvUpload}
                />

                <div
                  className={styles.cvDropArea}
                  onClick={() => cvInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                >
                  <div className={styles.cvDropIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 17V11L7 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 11L11 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 10V15C22 20 20 22 15 22H9C4 22 2 20 2 15V9C2 4 4 2 9 2H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 10H18C15 10 14 9 14 6V2L22 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className={styles.cvDropTitle}>
                    {uploadingCv ? "Uploading CV..." : "Drag & drop your CV here or click to browse"}
                  </div>
                  <div className={styles.cvDropSubtitle}>Supported formats: PDF, DOC, DOCX (Max 10MB)</div>
                </div>

                {cvFileName ? (
                  <div className={styles.cvFileItem}>
                    <div className={styles.cvFileLeft}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 11V17L11 15" stroke="#1B8A8A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="#1B8A8A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <div>
                        <div className={styles.cvFileName}>{cvFileName}</div>
                        <div className={styles.cvFileMeta}>{cvFileSize}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={styles.cvFileRemoveBtn}
                      onClick={() => {
                        setCvAssetId(null);
                        setCvFileName(null);
                        setCvFileSize(null);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : null}

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
                    <span>{loading ? "Submitting..." : "Explore Available Jobs"}</span>
                    <ArrowRight2 size={18} color="currentColor" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Completion Modal matching Figma Frame 473:2723 */}
      {showSuccessModal ? (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalIconCircle}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 12C22 17.52 17.52 22 12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2C17.52 2 22 6.48 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 6V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className={styles.modalHeading}>Your Profile Is Under Review</h2>
            <p className={styles.modalBodyText}>
              Thank you for submitting your information. Our recruitment division is carefully reviewing
              your profile and credentials before activating your account. You&apos;ll receive an email
              notification once your account has been approved.
            </p>
            <Link href="/login/doctor" className={styles.modalActionBtn} style={{ display: "block", textDecoration: "none" }}>
              Got It
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
