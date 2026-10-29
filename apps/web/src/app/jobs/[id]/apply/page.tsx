"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  DocumentUpload,
  Location,
  Moneys,
  TickCircle,
  CloseCircle,
  Warning2,
} from "iconsax-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { defaultFooterContent } from "@/lib/home-content";
import styles from "@/components/pages/pages.module.css";
import portalStyles from "@/components/portal/portal.module.css";

interface ApplicationFormResponse {
  status: string;
  accountStatus: string;
  isApproved: boolean;
  alreadyApplied: boolean;
  existingApplication?: {
    id: string;
    candidateCode: string;
    status: string;
    submittedAt: string;
  } | null;
  job: {
    id: string;
    ref: string;
    title: string;
    specialty: string;
    location: string;
    employmentType: string;
    salary: string;
    isUrgent: boolean;
  };
  prefill: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string | null;
    gender: string | null;
    nationalityId: string | null;
    currentLocation: string;
    currentJobTitle: string;
    specialtyId: string | null;
    yearsOfExperience: number;
    cv: {
      id: string;
      originalName: string;
      sizeBytes: number;
      url: string;
    } | null;
  };
  options: {
    noticePeriods: Array<{ id: string; code: string; name: string }>;
    referralSources: Array<{ id: string; code: string; name: string }>;
    employmentTypes: Array<{ id: string; code: string; name: string }>;
    currencies: Array<{ code: string; name: string; symbol: string | null }>;
    cities: Array<{ id: string; countryId: string; name: string }>;
    countries: Array<{ id: string; code: string; name: string; isGcc: boolean }>;
  };
}

export default function ApplyJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApplicationFormResponse | null>(null);

  // Form Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [nationalityId, setNationalityId] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [currentJobTitle, setCurrentJobTitle] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState<number>(0);
  const [mainQualification, setMainQualification] = useState("");
  const [qualificationDate, setQualificationDate] = useState("");
  const [preferredCityId, setPreferredCityId] = useState("");
  const [preferredEmploymentTypeId, setPreferredEmploymentTypeId] = useState("");
  const [noticePeriodId, setNoticePeriodId] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [expectedSalaryCurrencyCode, setExpectedSalaryCurrencyCode] = useState("SAR");
  const [openToPrivateSector, setOpenToPrivateSector] = useState(true);
  const [referralSourceId, setReferralSourceId] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // CV Handling
  const [useProfileCv, setUseProfileCv] = useState(true);
  const [cvFileAssetId, setCvFileAssetId] = useState<string | null>(null);
  const [uploadedCvName, setUploadedCvName] = useState<string | null>(null);
  const [uploadingCv, setUploadingCv] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<{
    applicationId: string;
    candidateCode: string;
    submittedAt: string;
  } | null>(null);

  // Access & Account Status Gate
  const [accessIssue, setAccessIssue] = useState<{
    type: "ROLE_MISMATCH" | "SUSPENDED" | "UNKNOWN";
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    async function loadForm() {
      try {
        setLoading(true);
        setError(null);
        setAccessIssue(null);

        // Verify session
        const authRes = await fetch("/api/auth/me", { credentials: "include" });

        if (authRes.status === 401) {
          // 1. Signed-out visitor: send to /login/doctor preserving returnTo
          router.replace(`/login/doctor?returnTo=/jobs/${jobId}/apply`);
          return;
        }

        if (authRes.status === 403) {
          // 2. Suspended / Deactivated account: show distinct message without looping
          const errData = await authRes.json().catch(() => ({}));
          setAccessIssue({
            type: "SUSPENDED",
            title: "Account Access Restricted",
            message:
              errData.message ||
              "Your account has been restricted, suspended, or deactivated. Please contact platform support.",
          });
          setLoading(false);
          return;
        }

        if (!authRes.ok) {
          // Server/proxy errors are not a signed-out state; do not bounce a signed-in doctor to login.
          throw new Error("We could not verify your session right now. Please try again in a moment.");
        }

        const authData = await authRes.json();
        const user = authData.user;

        if (!user) {
          router.replace(`/login/doctor?returnTo=/jobs/${jobId}/apply`);
          return;
        }

        // 3. Wrong role (e.g. FACILITY or PLATFORM_ADMIN): show distinct message without looping
        if (user.role !== "DOCTOR") {
          setAccessIssue({
            type: "ROLE_MISMATCH",
            title: "Doctor Account Required",
            message: `You are signed in as a ${
              user.role === "FACILITY" ? "Healthcare Facility" : "Platform Administrator"
            }. Job requisitions and candidate applications are exclusively for registered healthcare professionals. Please sign out and sign in with your doctor account to apply.`,
          });
          setLoading(false);
          return;
        }

        // 4. Doctor role: load application form (works for both PENDING_REVIEW and APPROVED)
        const res = await fetch(`/api/doctor/jobs/${jobId}/application-form`, {
          credentials: "include",
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to load job application details.");
        }

        const json: ApplicationFormResponse = await res.json();
        setData(json);

        // Prepopulate form fields
        setFirstName(json.prefill.firstName || "");
        setLastName(json.prefill.lastName || "");
        setEmail(json.prefill.email || "");
        setPhone(json.prefill.phone || "");
        if (json.prefill.dateOfBirth) {
          setDateOfBirth(new Date(json.prefill.dateOfBirth).toISOString().split("T")[0]);
        }
        setGender(json.prefill.gender || "MALE");
        setNationalityId(json.prefill.nationalityId || (json.options.countries[0]?.id ?? ""));
        setCurrentLocation(json.prefill.currentLocation || "");
        setCurrentJobTitle(json.prefill.currentJobTitle || "");
        // Empty falls back to the job specialty on the server; never default to an unrelated id.
        setSpecialtyId(json.prefill.specialtyId || "");
        setYearsOfExperience(json.prefill.yearsOfExperience || 0);

        if (json.options.noticePeriods.length > 0) {
          setNoticePeriodId(json.options.noticePeriods[0].id);
        }
        if (json.options.employmentTypes.length > 0) {
          setPreferredEmploymentTypeId(json.options.employmentTypes[0].id);
        }
        if (json.options.cities.length > 0) {
          setPreferredCityId(json.options.cities[0].id);
        }
        if (json.options.referralSources.length > 0) {
          setReferralSourceId(json.options.referralSources[0].id);
        }

        if (json.prefill.cv) {
          setCvFileAssetId(json.prefill.cv.id);
          setUploadedCvName(json.prefill.cv.originalName);
        } else {
          setUseProfileCv(false);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Unable to initialize application form.");
      } finally {
        setLoading(false);
      }
    }

    loadForm();
  }, [jobId, router]);

  // Handle uploading a new job-specific CV file
  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("CV file size exceeds the 10MB maximum limit.");
      return;
    }

    try {
      setUploadingCv(true);
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

        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.message || "CV upload failed.");
        }

        setCvFileAssetId(resData.file.id);
        setUploadedCvName(resData.file.originalName);
        setUseProfileCv(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert(err.message || "Failed to upload CV document.");
    } finally {
      setUploadingCv(false);
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      setSubmitError("Please confirm your acceptance of the terms and privacy statement.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const payload = {
        firstName,
        lastName,
        email,
        phoneNumber: phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
        gender,
        nationalityId: nationalityId || null,
        currentLocation,
        currentJobTitle,
        specialtyId: specialtyId || null,
        yearsOfExperience: Number(yearsOfExperience) || 0,
        mainQualification,
        qualificationDate: qualificationDate ? new Date(qualificationDate).toISOString() : null,
        preferredCityId: preferredCityId || null,
        preferredEmploymentTypeId: preferredEmploymentTypeId || null,
        noticePeriodId: noticePeriodId || null,
        expectedSalary: expectedSalary ? Number(expectedSalary) : null,
        expectedSalaryCurrencyCode,
        openToPrivateSector,
        referralSourceId: referralSourceId || null,
        additionalNotes,
        cvId: cvFileAssetId,
      };

      const res = await fetch(`/api/doctor/jobs/${jobId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.message || "Failed to submit job application.");
      }

      setSubmissionResult({
        applicationId: resJson.applicationId,
        candidateCode: resJson.candidateCode,
        submittedAt: resJson.submittedAt,
      });
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || "An error occurred during submission.");
    } finally {
      setSubmitting(false);
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
    <>
      <SiteHeader content={headerContent} activeHref="/jobs" />

      <main style={{ backgroundColor: "#f8fafc", minHeight: "80vh", padding: "40px 0 80px" }}>
        <div className="container" style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 20px" }}>
          {/* Breadcrumb matching Figma 421:6725 */}
          <nav className={styles.jobDetailsBreadcrumb} aria-label="Breadcrumb">
            <Link href="/jobs">Available Jobs</Link>
            <ArrowRight size={14} color="currentColor" variant="Outline" />
            <Link href={`/jobs/${jobId}`}>Job Details</Link>
            <ArrowRight size={14} color="currentColor" variant="Outline" />
            <span>Apply Job</span>
          </nav>

          {loading ? (
            <div className={portalStyles.loadingStateWrap} style={{ padding: "80px 0" }}>
              <div className={portalStyles.spinner} />
              <p style={{ color: "#5b6e84", fontSize: "15px" }}>Loading job application form...</p>
            </div>
          ) : accessIssue ? (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #fed7aa",
                borderRadius: "16px",
                padding: "48px 32px",
                textAlign: "center",
                maxWidth: "680px",
                margin: "40px auto",
                boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
              }}
            >
              <Warning2 size={48} color="#ea580c" variant="Bold" style={{ margin: "0 auto 16px" }} />
              <h2 style={{ color: "#0a2647", fontSize: "22px", marginBottom: "12px", fontWeight: 700 }}>
                {accessIssue.title}
              </h2>
              <p style={{ color: "#475569", fontSize: "15px", lineHeight: 1.6, marginBottom: "28px" }}>
                {accessIssue.message}
              </p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                <Link href="/jobs" className={styles.applyButton} style={{ display: "inline-flex" }}>
                  Browse Available Jobs
                </Link>
                <Link
                  href="/"
                  className={styles.saveJobButton}
                  style={{ display: "inline-flex", textDecoration: "none" }}
                >
                  Return to Home
                </Link>
              </div>
            </div>
          ) : error ? (
            <div className={portalStyles.errorStateWrap} style={{ padding: "60px 20px", textAlign: "center" }}>
              <h2 style={{ color: "#0a2647", fontSize: "20px" }}>Unable to load application</h2>
              <p style={{ color: "#5b6e84", fontSize: "14px" }}>{error}</p>
              <Link href="/jobs" className={styles.applyButton} style={{ marginTop: "16px", display: "inline-flex" }}>
                Browse Available Jobs
              </Link>
            </div>
          ) : data ? (
            <>
              {/* Top Job Summary Card */}
              <section className={styles.jobDetailsHeaderCard} style={{ marginBottom: "28px" }}>
                <div className={styles.jobDetailsHeaderLeft}>
                  <span className={styles.jobDetailsRef}>{data.job.ref}</span>
                  <h1 className={styles.jobDetailsTitle} style={{ fontSize: "26px", lineHeight: "34px" }}>
                    {data.job.title}
                  </h1>
                  <p className={styles.jobDetailsSubtext}>Confidential Client Institution</p>

                  <div className={styles.jobDetailsMetaRow}>
                    <span className={styles.jobDetailsMetaItem}>
                      <Location size={18} color="var(--blue-400)" variant="Outline" />
                      {data.job.location}
                    </span>
                    <span className={styles.jobDetailsMetaItem}>
                      <Moneys size={18} color="var(--blue-400)" variant="Outline" />
                      {data.job.salary}
                    </span>
                    <span className={styles.jobDetailsMetaItem}>
                      <strong style={{ color: "var(--green-500)" }}>{data.job.employmentType}</strong>
                    </span>
                  </div>
                </div>
              </section>

              {/* Gate check 1: Doctor Account Under Review */}
              {!data.isApproved ? (
                <div
                  style={{
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    borderRadius: "16px",
                    padding: "32px",
                    textAlign: "center",
                    color: "#92400e",
                  }}
                >
                  <Warning2 size={44} color="#d97706" variant="Bold" style={{ margin: "0 auto 12px" }} />
                  <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 8px 0" }}>
                    Your Profile Is Under Platform Review
                  </h2>
                  <p style={{ fontSize: "15px", maxWidth: "600px", margin: "0 auto 20px", lineHeight: 1.6 }}>
                    Only verified medical professionals approved by the platform may apply to active healthcare job
                    requisitions. Our platform administrators are currently reviewing your credentials.
                  </p>
                  <Link href="/dashboard/doctor" className={styles.applyButton} style={{ display: "inline-flex" }}>
                    Return to Doctor Dashboard
                  </Link>
                </div>
              ) : data.alreadyApplied || submissionResult ? (
                /* Submission Confirmation Popup Card matching Figma Pop 424:5601 */
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #96c9c9",
                    borderRadius: "20px",
                    padding: "48px 36px",
                    textAlign: "center",
                    boxShadow: "0 10px 30px rgba(27, 138, 138, 0.08)",
                  }}
                >
                  <div
                    style={{
                      width: "68px",
                      height: "68px",
                      borderRadius: "50%",
                      background: "#e8f3f3",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 20px",
                    }}
                  >
                    <TickCircle size={40} color="#1b8a8a" variant="Bold" />
                  </div>

                  <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#0a2647", margin: "0 0 8px 0" }}>
                    Application Submitted Successfully!
                  </h2>

                  <div
                    style={{
                      display: "inline-block",
                      background: "#f1f5f9",
                      padding: "6px 18px",
                      borderRadius: "20px",
                      fontWeight: 700,
                      color: "#1b8a8a",
                      fontSize: "14px",
                      marginBottom: "16px",
                    }}
                  >
                    Candidate ID: {submissionResult?.candidateCode || data.existingApplication?.candidateCode}
                  </div>

                  <p style={{ fontSize: "15px", color: "#5b6e84", maxWidth: "560px", margin: "0 auto 28px", lineHeight: 1.6 }}>
                    Your clinical application has been sent anonymously to the healthcare facility under your unique candidate ID.
                    Your personal identity, contact details, and CV remain confidential until you explicitly grant consent.
                  </p>

                  <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                    <Link href="/dashboard/doctor" className={styles.applyButton}>
                      View in Doctor Dashboard
                    </Link>
                    <Link
                      href="/jobs"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 28px",
                        height: "48px",
                        borderRadius: "12px",
                        background: "#f1f5f9",
                        color: "#0a2647",
                        fontSize: "15px",
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      Browse More Jobs
                    </Link>
                  </div>
                </div>
              ) : (
                /* Application Form matching Figma 421:6725 */
                <form
                  onSubmit={handleSubmitApplication}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "20px",
                    padding: "36px 40px",
                    boxShadow: "0 4px 16px rgba(10, 38, 71, 0.04)",
                  }}
                >
                  <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#0a2647", marginBottom: "6px" }}>
                    Job Application Form
                  </h2>
                  <p style={{ fontSize: "14px", color: "#5b6e84", marginBottom: "28px" }}>
                    Please review your prefilled credentials and specify your position preferences. Your identity will remain
                    strictly anonymous to the healthcare facility until you grant consent.
                  </p>

                  {submitError && (
                    <div
                      style={{
                        background: "#fff1f2",
                        border: "1px solid #fecaca",
                        color: "#be123c",
                        padding: "14px 18px",
                        borderRadius: "10px",
                        fontSize: "14px",
                        marginBottom: "24px",
                      }}
                    >
                      {submitError}
                    </div>
                  )}

                  {/* Section 1: Candidate Personal Info */}
                  <fieldset style={{ border: "none", padding: 0, margin: "0 0 32px 0" }}>
                    <legend style={{ fontSize: "16px", fontWeight: 700, color: "#1b8a8a", marginBottom: "16px" }}>
                      1. Personal & Contact Information
                    </legend>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#3b516c", marginBottom: "6px" }}>
                          First Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            fontSize: "14px",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#3b516c", marginBottom: "6px" }}>
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            fontSize: "14px",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#3b516c", marginBottom: "6px" }}>
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            fontSize: "14px",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#3b516c", marginBottom: "6px" }}>
                          Mobile Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            fontSize: "14px",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#3b516c", marginBottom: "6px" }}>
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            fontSize: "14px",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#3b516c", marginBottom: "6px" }}>
                          Gender
                        </label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            fontSize: "14px",
                            backgroundColor: "#fff",
                          }}
                        >
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#3b516c", marginBottom: "6px" }}>
                          Nationality
                        </label>
                        <select
                          value={nationalityId}
                          onChange={(e) => setNationalityId(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            fontSize: "14px",
                            backgroundColor: "#fff",
                          }}
                        >
                          {data.options.countries.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.isGcc ? "(GCC)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#3b516c", marginBottom: "6px" }}>
                          Current Residence
                        </label>
                        <input
                          type="text"
                          value={currentLocation}
                          onChange={(e) => setCurrentLocation(e.target.value)}
                          placeholder="e.g. Riyadh, Saudi Arabia"
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            fontSize: "14px",
                          }}
                        />
                      </div>
                    </div>
                  </fieldset>

                  {/* Section 2: Clinical & Professional Details */}
                  <fieldset style={{ border: "none", padding: 0, margin: "0 0 32px 0" }}>
                    <legend style={{ fontSize: "16px", fontWeight: 700, color: "#1b8a8a", marginBottom: "16px" }}>
                      2. Clinical & Professional Credentials
                    </legend>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#3b516c", marginBottom: "6px" }}>
                          Current Job Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={currentJobTitle}
                          onChange={(e) => setCurrentJobTitle(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            fontSize: "14px",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#3b516c", marginBottom: "6px" }}>
                          Years of Clinical Experience *
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="60"
                          required
                          value={yearsOfExperience}
                          onChange={(e) => setYearsOfExperience(parseInt(e.target.value, 10) || 0)}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            fontSize: "14px",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#3b516c", marginBottom: "6px" }}>
                          Main Medical Qualification
                        </label>
                        <input
                          type="text"
                          value={mainQualification}
                          onChange={(e) => setMainQualification(e.target.value)}
                          placeholder="e.g. Fellowship in Paediatric Intensive Care"
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            fontSize: "14px",
                          }}
                        />
                      </div>
                    </div>
                  </fieldset>

                  {/* Section 3: Job Preferences & Availability */}
                  <fieldset style={{ border: "none", padding: 0, margin: "0 0 32px 0" }}>
                    <legend style={{ fontSize: "16px", fontWeight: 700, color: "#1b8a8a", marginBottom: "16px" }}>
                      3. Position Preferences & Availability
                    </legend>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#3b516c", marginBottom: "6px" }}>
                          Preferred GCC City
                        </label>
                        <select
                          value={preferredCityId}
                          onChange={(e) => setPreferredCityId(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            fontSize: "14px",
                            backgroundColor: "#fff",
                          }}
                        >
                          {data.options.cities.map((city) => (
                            <option key={city.id} value={city.id}>
                              {city.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#3b516c", marginBottom: "6px" }}>
                          Notice Period
                        </label>
                        <select
                          value={noticePeriodId}
                          onChange={(e) => setNoticePeriodId(e.target.value)}
                          // Notice period options are platform-managed and still awaiting client approval;
                          // until they exist the field is disabled and submits no value.
                          disabled={data.options.noticePeriods.length === 0}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            fontSize: "14px",
                            backgroundColor: data.options.noticePeriods.length === 0 ? "#f8fafc" : "#fff",
                            color: data.options.noticePeriods.length === 0 ? "#8e9baa" : undefined,
                          }}
                        >
                          {data.options.noticePeriods.length === 0 ? (
                            <option value="">Options pending client approval</option>
                          ) : (
                            data.options.noticePeriods.map((np) => (
                              <option key={np.id} value={np.id}>
                                {np.name}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#3b516c", marginBottom: "6px" }}>
                          Employment Type
                        </label>
                        <select
                          value={preferredEmploymentTypeId}
                          onChange={(e) => setPreferredEmploymentTypeId(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            fontSize: "14px",
                            backgroundColor: "#fff",
                          }}
                        >
                          {data.options.employmentTypes.map((et) => (
                            <option key={et.id} value={et.id}>
                              {et.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#3b516c", marginBottom: "6px" }}>
                          Expected Monthly Salary
                        </label>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <select
                            value={expectedSalaryCurrencyCode}
                            onChange={(e) => setExpectedSalaryCurrencyCode(e.target.value)}
                            style={{
                              width: "100px",
                              padding: "12px 8px",
                              borderRadius: "10px",
                              border: "1px solid #cbd5e1",
                              fontSize: "14px",
                              backgroundColor: "#fff",
                            }}
                          >
                            {data.options.currencies.map((curr) => (
                              <option key={curr.code} value={curr.code}>
                                {curr.code}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            placeholder="Amount"
                            value={expectedSalary}
                            onChange={(e) => setExpectedSalary(e.target.value)}
                            style={{
                              flex: 1,
                              padding: "12px 14px",
                              borderRadius: "10px",
                              border: "1px solid #cbd5e1",
                              fontSize: "14px",
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: "16px" }}>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px", color: "#3b516c" }}>
                        <input
                          type="checkbox"
                          checked={openToPrivateSector}
                          onChange={(e) => setOpenToPrivateSector(e.target.checked)}
                          style={{ width: "18px", height: "18px", accentColor: "#1b8a8a" }}
                        />
                        <span>Open to opportunities in both government and private healthcare sectors</span>
                      </label>
                    </div>
                  </fieldset>

                  {/* Section 4: CV Upload & Documents */}
                  <fieldset style={{ border: "none", padding: 0, margin: "0 0 32px 0" }}>
                    <legend style={{ fontSize: "16px", fontWeight: 700, color: "#1b8a8a", marginBottom: "16px" }}>
                      4. Curriculum Vitae (CV)
                    </legend>

                    {data.prefill.cv && (
                      <div
                        style={{
                          background: useProfileCv ? "#e8f3f3" : "#f8fafc",
                          border: useProfileCv ? "1px solid #1b8a8a" : "1px solid #cbd5e1",
                          borderRadius: "12px",
                          padding: "16px 20px",
                          marginBottom: "16px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <input
                            type="radio"
                            id="use-profile-cv"
                            name="cv-choice"
                            checked={useProfileCv}
                            onChange={() => {
                              setUseProfileCv(true);
                              setCvFileAssetId(data.prefill.cv?.id || null);
                              setUploadedCvName(data.prefill.cv?.originalName || null);
                            }}
                            style={{ accentColor: "#1b8a8a", width: "18px", height: "18px" }}
                          />
                          <label htmlFor="use-profile-cv" style={{ cursor: "pointer", fontSize: "14px", color: "#0a2647", fontWeight: 600 }}>
                            Use existing profile CV: <strong>{data.prefill.cv.originalName}</strong>
                            <span style={{ fontSize: "12px", color: "#5b6e84", marginLeft: "8px" }}>
                              ({Math.round(data.prefill.cv.sizeBytes / 1024)} KB)
                            </span>
                          </label>
                        </div>
                      </div>
                    )}

                    <div
                      style={{
                        background: !useProfileCv ? "#e8f3f3" : "#f8fafc",
                        border: !useProfileCv ? "1px solid #1b8a8a" : "1px solid #cbd5e1",
                        borderRadius: "12px",
                        padding: "16px 20px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                        <input
                          type="radio"
                          id="upload-new-cv"
                          name="cv-choice"
                          checked={!useProfileCv}
                          onChange={() => setUseProfileCv(false)}
                          style={{ accentColor: "#1b8a8a", width: "18px", height: "18px" }}
                        />
                        <label htmlFor="upload-new-cv" style={{ cursor: "pointer", fontSize: "14px", color: "#0a2647", fontWeight: 600 }}>
                          Upload a tailored CV for this application (PDF or DOCX, max 10MB)
                        </label>
                      </div>

                      {!useProfileCv && (
                        <div style={{ paddingLeft: "30px" }}>
                          <label
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "10px 20px",
                              borderRadius: "10px",
                              border: "1px dashed #1b8a8a",
                              background: "#ffffff",
                              cursor: "pointer",
                              fontSize: "14px",
                              color: "#1b8a8a",
                              fontWeight: 600,
                            }}
                          >
                            <DocumentUpload size={20} color="#1b8a8a" />
                            <span>{uploadingCv ? "Uploading..." : uploadedCvName && !useProfileCv ? `Replace: ${uploadedCvName}` : "Select CV File"}</span>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx"
                              onChange={handleCvUpload}
                              disabled={uploadingCv}
                              style={{ display: "none" }}
                            />
                          </label>
                          {uploadedCvName && !useProfileCv && (
                            <span style={{ fontSize: "13px", color: "#047857", marginLeft: "12px", fontWeight: 600 }}>
                              ✓ Attached: {uploadedCvName}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </fieldset>

                  {/* Section 5: Additional Notes */}
                  <fieldset style={{ border: "none", padding: 0, margin: "0 0 32px 0" }}>
                    <legend style={{ fontSize: "16px", fontWeight: 700, color: "#1b8a8a", marginBottom: "16px" }}>
                      5. Additional Notes & Career Statement
                    </legend>
                    <textarea
                      rows={4}
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      placeholder="Explain your clinical background, GCC licensing status, and career goals for this position..."
                      style={{
                        width: "100%",
                        padding: "14px",
                        borderRadius: "10px",
                        border: "1px solid #cbd5e1",
                        fontSize: "14px",
                        lineHeight: 1.5,
                      }}
                    />
                  </fieldset>

                  {/* Section 6: Terms Acceptance */}
                  <div style={{ marginBottom: "28px", padding: "16px", background: "#f8fafc", borderRadius: "12px" }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", fontSize: "14px", color: "#3b516c" }}>
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        style={{ width: "20px", height: "20px", accentColor: "#1b8a8a", marginTop: "2px" }}
                      />
                      <span>
                        I confirm that all medical qualifications, registration numbers, and clinical details provided are true and accurate.
                        I understand that my candidate details will be shared anonymously with the healthcare facility, and my personal identity
                        will only be revealed upon my explicit consent and platform approval.
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <button
                      type="submit"
                      disabled={submitting || uploadingCv}
                      className={styles.applyButton}
                      style={{ border: "none", cursor: submitting ? "not-allowed" : "pointer" }}
                    >
                      {submitting ? "Submitting Application..." : "Submit Application Anonymously"}
                    </button>
                    <Link
                      href={`/jobs/${jobId}`}
                      style={{ color: "#5b6e84", fontSize: "15px", fontWeight: 600, textDecoration: "none" }}
                    >
                      Cancel
                    </Link>
                  </div>
                </form>
              )}
            </>
          ) : null}
        </div>
      </main>

      <SiteFooter content={defaultFooterContent} />
    </>
  );
}
