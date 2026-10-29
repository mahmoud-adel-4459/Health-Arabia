"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TickCircle, ArrowLeft, InfoCircle, Briefcase } from "iconsax-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SimpleAuthFooter } from "@/components/site/SimpleAuthFooter";
import { defaultHeaderContent } from "@/lib/home-content";
import styles from "@/components/portal/portal.module.css";

export const dynamic = "force-dynamic";

interface ReferenceData {
  countries: Array<{ id: string; nameEn: string; nameAr: string; isoCode: string; isGcc?: boolean }>;
  cities: Array<{ id: string; countryId: string; nameEn: string; nameAr: string }>;
  specialties: Array<{ id: string; nameEn: string; nameAr: string; slug: string }>;
  employmentTypes: Array<{ id: string; code: string; nameEn: string }>;
  salaryCurrencies: Array<{ code: string; symbol: string; nameEn: string }>;
  salaryPeriods: Array<{ id: string; code: string; nameEn: string }>;
  experienceOptions: Array<{ value: number; label: string }>;
  facilityDefaults?: {
    facilityId: string;
    facilityName: string;
    countryId: string | null;
    countryName: string;
    cityId: string | null;
    cityName: string;
    officerName: string;
    hospitalEmail: string | null;
    officerPhone: string;
  } | null;
}

interface SubmittedJobData {
  id: string;
  referenceNumber: string;
  title: string;
  positions: number;
  specialty: string;
  location: string;
  status: string;
}

export default function RequestMedicalStaffPage() {
  const router = useRouter();

  const [loadingMeta, setLoadingMeta] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedJob, setSubmittedJob] = useState<SubmittedJobData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facilityName, setFacilityName] = useState<string>("");
  const [officerName, setOfficerName] = useState<string>("");

  const [referenceData, setReferenceData] = useState<ReferenceData>({
    countries: [],
    cities: [],
    specialties: [],
    employmentTypes: [],
    salaryCurrencies: [],
    salaryPeriods: [],
    experienceOptions: [
      { value: 1, label: "1+ Years" },
      { value: 2, label: "2+ Years" },
      { value: 3, label: "3+ Years" },
      { value: 5, label: "5+ Years" },
      { value: 8, label: "8+ Years / Consultant" },
    ],
  });

  const [formData, setFormData] = useState({
    title: "",
    aboutHospital: "",
    specialtyId: "",
    positions: 3,
    minYearsExperience: 3,
    employmentTypeId: "",
    countryId: "",
    cityId: "",
    salaryMin: "9000",
    salaryMax: "10000",
    salaryCurrencyCode: "GBP",
    salaryPeriodId: "",
    description: "",
    responsibilities: "",
    requirements: "",
    benefits: "",
    isUrgent: false,
  });

  useEffect(() => {
    async function initData() {
      try {
        setLoadingMeta(true);

        // 1. Check authenticated session
        const sessionRes = await fetch("/api/auth/me", { credentials: "include" }).catch(() => null);
        if (!sessionRes || !sessionRes.ok) {
          router.replace("/login/facility?returnTo=/request-medical-staff");
          return;
        }
        const sessionData = await sessionRes.json();
        if (sessionData.user?.role !== "FACILITY") {
          router.replace("/login/facility?returnTo=/request-medical-staff");
          return;
        }

        // 2. Fetch metadata & facility defaults
        const metaRes = await fetch("/api/facility/jobs/meta", { credentials: "include" });
        if (metaRes.ok) {
          const metaJson: ReferenceData = await metaRes.json();
          setReferenceData(metaJson);

          if (metaJson.facilityDefaults) {
            setFacilityName(metaJson.facilityDefaults.facilityName);
            setOfficerName(metaJson.facilityDefaults.officerName);
          }

          setFormData((prev) => ({
            ...prev,
            specialtyId: metaJson.specialties[0]?.id ?? "",
            employmentTypeId: metaJson.employmentTypes[0]?.id ?? "",
            countryId: metaJson.facilityDefaults?.countryId || metaJson.countries[0]?.id || "",
            cityId: metaJson.facilityDefaults?.cityId || metaJson.cities[0]?.id || "",
            salaryCurrencyCode: metaJson.salaryCurrencies[0]?.code ?? "SAR",
            salaryPeriodId: metaJson.salaryPeriods[0]?.id ?? "",
          }));
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoadingMeta(false);
      }
    }

    initData();
  }, [router]);

  const filteredCities = formData.countryId
    ? referenceData.cities.filter((c) => c.countryId === formData.countryId)
    : referenceData.cities;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.title.trim()) {
      setErrorMessage("Please enter the Job / Role Title (e.g. Consultant Paediatric ICU).");
      return;
    }
    if (!formData.specialtyId) {
      setErrorMessage("Please select a required medical specialty.");
      return;
    }
    if (!formData.description.trim()) {
      setErrorMessage("Please outline the clinical job description.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/facility/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: formData.title.trim(),
          aboutHospital: formData.aboutHospital.trim() || null,
          specialtyId: formData.specialtyId,
          countryId: formData.countryId,
          cityId: formData.cityId,
          employmentTypeId: formData.employmentTypeId,
          positions: Number(formData.positions) || 1,
          minYearsExperience: Number(formData.minYearsExperience) || 0,
          salaryMin: formData.salaryMin ? Number(formData.salaryMin) : null,
          salaryMax: formData.salaryMax ? Number(formData.salaryMax) : null,
          salaryCurrencyCode: formData.salaryCurrencyCode,
          salaryPeriodId: formData.salaryPeriodId || null,
          description: formData.description.trim(),
          responsibilities: formData.responsibilities.trim() || undefined,
          requirements: formData.requirements.trim() || undefined,
          benefits: formData.benefits.trim() || undefined,
          isUrgent: formData.isUrgent,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || "Failed to submit job requisition.");
      }

      setSubmittedJob(resData.job);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit job requisition.");
    } finally {
      setSubmitting(false);
    }
  };

  const headerContent = {
    ...defaultHeaderContent,
    userMenu: {
      initials: "HF",
      name: facilityName || "Healthcare Facility",
      role: "FACILITY" as const,
      status: "APPROVED" as const,
      avatarUrl: null,
    },
  };

  return (
    <div className={styles.portalContainer}>
      <SiteHeader content={headerContent as any} activeHref="/dashboard/facility" />

      <main className={styles.portalMain} style={{ backgroundColor: "#f8fafc", padding: "40px 16px 64px 16px" }}>
        <div style={{ maxWidth: "780px", margin: "0 auto" }}>
          {/* Back Link */}
          <div style={{ marginBottom: "20px" }}>
            <Link
              href="/dashboard/facility"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#1b8a8a",
                textDecoration: "none",
              }}
            >
              <ArrowLeft size={16} color="currentColor" />
              <span>Back to Facility Dashboard</span>
            </Link>
          </div>

          {/* Page Title & Subtitle matching Figma 440:3528 */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: 700,
                color: "#0a2647",
                marginBottom: "8px",
                fontFamily: "var(--font-carlito, inherit)",
              }}
            >
              Request Medical Staff
            </h1>
            <p
              style={{
                fontSize: "16px",
                color: "#5b6e84",
                maxWidth: "600px",
                margin: "0 auto",
                lineHeight: "1.5",
              }}
            >
              Tell us about your staffing needs and we will find the right medical professionals and specialized clinicians.
            </p>
          </div>

          {/* Success / Submitted Confirmation State */}
          {submittedJob ? (
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                padding: "48px 36px",
                textAlign: "center",
                boxShadow: "0 4px 16px rgba(10, 38, 71, 0.05)",
              }}
            >
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  backgroundColor: "#ecfdf5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px auto",
                }}
              >
                <TickCircle size={44} color="#059669" variant="Bold" />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", marginBottom: "16px" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 14px",
                    backgroundColor: "#f0fdfa",
                    color: "#0f766e",
                    border: "1px solid #99f6e4",
                    borderRadius: "20px",
                    fontSize: "13px",
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                  }}
                >
                  REF: {submittedJob.referenceNumber}
                </span>

                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 14px",
                    backgroundColor: "#fef3c7",
                    color: "#b45309",
                    border: "1px solid #fde68a",
                    borderRadius: "20px",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  Status: Pending Platform Review
                </span>
              </div>

              <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#0a2647", marginBottom: "12px" }}>
                Job Requisition Submitted for Review!
              </h2>

              <p style={{ fontSize: "15px", color: "#5b6e84", lineHeight: "1.6", maxWidth: "580px", margin: "0 auto 28px auto" }}>
                Thank you for submitting your requisition for <strong>{submittedJob.title}</strong> ({submittedJob.positions} position(s)) for{" "}
                <strong>{facilityName}</strong>. Our platform moderation team will review the job details and verify clinical requirements. Once approved,
                the job will be published anonymously to qualified medical professionals across the GCC.
              </p>

              <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
                <Link
                  href="/dashboard/facility"
                  className={styles.btnSolidTeal}
                  style={{ padding: "12px 24px", fontSize: "14px" }}
                >
                  View Facility Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedJob(null);
                    setFormData((prev) => ({
                      ...prev,
                      title: "",
                      aboutHospital: "",
                      description: "",
                      responsibilities: "",
                      requirements: "",
                      benefits: "",
                    }));
                  }}
                  className={styles.btnSecondary}
                  style={{ padding: "12px 24px", fontSize: "14px" }}
                >
                  Submit Another Job Requisition
                </button>
              </div>
            </div>
          ) : (
            /* Form Card matching Figma node 440:3528 & 421:6082 */
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                padding: "36px 40px",
                boxShadow: "0 4px 16px rgba(10, 38, 71, 0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: "16px",
                  borderBottom: "1px solid #f1f5f9",
                  marginBottom: "24px",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0a2647", margin: 0 }}>
                    Hospital & Staffing Requirements
                  </h2>
                  <p style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                    Linked automatically to registered facility: <strong>{facilityName || "Authenticated Facility"}</strong>
                    {officerName ? ` • Recruiter: ${officerName}` : ""}
                  </p>
                </div>
                <span style={{ fontSize: "12px", color: "#64748b" }}>* Required</span>
              </div>

              {errorMessage && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "12px 16px",
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    color: "#991b1b",
                    fontSize: "14px",
                    marginBottom: "20px",
                  }}
                >
                  <InfoCircle size={18} color="#dc2626" variant="Bold" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
                {/* 1. About the Hospital (Figma 440:3528 - Anonymous overview) */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>
                    About the Hospital
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 400, marginLeft: "8px" }}>
                      (Displayed anonymously on public job page)
                    </span>
                  </label>
                  <textarea
                    className={styles.formTextarea}
                    rows={3}
                    value={formData.aboutHospital}
                    onChange={(e) => setFormData({ ...formData, aboutHospital: e.target.value })}
                    placeholder="Enter The Hospital Details without Mention Hospital Name, Location or any Specific Information"
                  />
                </div>

                {/* 2. Role / Job Title (Required for complete Job Details Figma 421:6082) */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Job / Role Title *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Consultant Paediatric ICU, Senior Specialist Radiologist"
                    required
                  />
                </div>

                {/* 3. Required Specialty & Number of Positions (2 Columns) */}
                <div className={styles.formGrid}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Required Specialty *</label>
                    <select
                      className={styles.formInput}
                      value={formData.specialtyId}
                      onChange={(e) => setFormData({ ...formData, specialtyId: e.target.value })}
                      required
                    >
                      <option value="">Select Specialized Medical Area</option>
                      {referenceData.specialties.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Number of Positions *</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      className={styles.formInput}
                      value={formData.positions}
                      onChange={(e) => setFormData({ ...formData, positions: parseInt(e.target.value, 10) || 1 })}
                      required
                    />
                  </div>
                </div>

                {/* 4. Minimum Experience Required & Contract Type (2 Columns) */}
                <div className={styles.formGrid}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Minimum Experience Required *</label>
                    <select
                      className={styles.formInput}
                      value={formData.minYearsExperience}
                      onChange={(e) => setFormData({ ...formData, minYearsExperience: parseInt(e.target.value, 10) || 0 })}
                      required
                    >
                      {referenceData.experienceOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Contract Type *</label>
                    <select
                      className={styles.formInput}
                      value={formData.employmentTypeId}
                      onChange={(e) => setFormData({ ...formData, employmentTypeId: e.target.value })}
                      required
                    >
                      <option value="">Select Term Type</option>
                      {referenceData.employmentTypes.map((et) => (
                        <option key={et.id} value={et.id}>
                          {et.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 5. Location (Country & City) */}
                <div className={styles.formGrid}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Country *</label>
                    <select
                      className={styles.formInput}
                      value={formData.countryId}
                      onChange={(e) => setFormData({ ...formData, countryId: e.target.value })}
                      required
                    >
                      <option value="">Select Country</option>
                      {referenceData.countries.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nameEn} {c.isGcc ? "(GCC)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>City *</label>
                    <select
                      className={styles.formInput}
                      value={formData.cityId}
                      onChange={(e) => setFormData({ ...formData, cityId: e.target.value })}
                      required
                    >
                      <option value="">Select City</option>
                      {filteredCities.map((ct) => (
                        <option key={ct.id} value={ct.id}>
                          {ct.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 6. Salary Range & Currency (3 Columns) */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: "16px" }}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Minimum Salary</label>
                    <input
                      type="number"
                      className={styles.formInput}
                      placeholder="e.g. 9000"
                      value={formData.salaryMin}
                      onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Maximum Salary</label>
                    <input
                      type="number"
                      className={styles.formInput}
                      placeholder="e.g. 10000"
                      value={formData.salaryMax}
                      onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Currency</label>
                    <select
                      className={styles.formInput}
                      value={formData.salaryCurrencyCode}
                      onChange={(e) => setFormData({ ...formData, salaryCurrencyCode: e.target.value })}
                    >
                      {referenceData.salaryCurrencies.length > 0 ? (
                        referenceData.salaryCurrencies.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code} ({c.symbol})
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="SAR">SAR</option>
                          <option value="AED">AED</option>
                          <option value="QAR">QAR</option>
                          <option value="GBP">GBP</option>
                          <option value="USD">USD</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* 7. Job Description (Figma 440:3528) */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Job Description *</label>
                  <textarea
                    className={styles.formTextarea}
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Outline clinical duties, specific licensing requirements (CCT, American Board), and any special benefits offered..."
                    required
                  />
                </div>

                {/* 8. Key Responsibilities (Figma 440:3528 & 421:6082) */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>
                    Key Responsibilities
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 400, marginLeft: "8px" }}>
                      (Enter one responsibility per line)
                    </span>
                  </label>
                  <textarea
                    className={styles.formTextarea}
                    rows={4}
                    value={formData.responsibilities}
                    onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                    placeholder="Provide direct patient care and continuous monitoring&#10;Assist physicians during medical procedures&#10;Maintain accurate and up-to-date patient medical records&#10;Collaborate with interdisciplinary healthcare teams"
                  />
                </div>

                {/* 9. Requirements (Figma 440:3528 & 421:6082) */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>
                    Requirements
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 400, marginLeft: "8px" }}>
                      (Enter one requirement per line)
                    </span>
                  </label>
                  <textarea
                    className={styles.formTextarea}
                    rows={4}
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    placeholder="Bachelor's Degree in Medicine / Clinical Board&#10;Valid medical consultant license or board certification (UK CCT / American Board)&#10;BLS & ACLS Certification&#10;3-5 years of specialized intensive care experience"
                  />
                </div>

                {/* 10. Benefits & Perks (Figma 440:3528 & 421:6082) */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>
                    Benefits & Perks
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 400, marginLeft: "8px" }}>
                      (Enter one benefit per line)
                    </span>
                  </label>
                  <textarea
                    className={styles.formTextarea}
                    rows={3}
                    value={formData.benefits}
                    onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                    placeholder="Tax-free competitive salary package&#10;Comprehensive family medical insurance&#10;Annual business-class flights to home country&#10;Generous housing allowance and relocation assistance"
                  />
                </div>

                {/* Urgent Hiring Toggle */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                  <input
                    type="checkbox"
                    id="isUrgent"
                    checked={formData.isUrgent}
                    onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })}
                    style={{ width: "18px", height: "18px", accentColor: "#1b8a8a" }}
                  />
                  <label htmlFor="isUrgent" style={{ fontSize: "14px", fontWeight: 600, color: "#0a2647", cursor: "pointer" }}>
                    🔥 Mark this job as Urgently Hiring
                  </label>
                </div>

                {/* Submit Button matching Figma 440:3528 */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={styles.btnSolidTeal}
                    style={{
                      padding: "14px 36px",
                      fontSize: "15px",
                      fontWeight: 700,
                      backgroundColor: "#1b8a8a",
                      color: "#ffffff",
                      borderRadius: "8px",
                      border: "none",
                      cursor: submitting ? "not-allowed" : "pointer",
                      opacity: submitting ? 0.7 : 1,
                    }}
                  >
                    {submitting ? "Submitting for Platform Review..." : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Figma 440:3528 uses the slim copyright footer */}
      <SimpleAuthFooter />
    </div>
  );
}
