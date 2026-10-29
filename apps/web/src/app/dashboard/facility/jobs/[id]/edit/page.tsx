"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, InfoCircle, TickCircle } from "iconsax-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SimpleAuthFooter } from "@/components/site/SimpleAuthFooter";
import { defaultHeaderContent } from "@/lib/home-content";
import styles from "@/components/portal/portal.module.css";

export const dynamic = "force-dynamic";

interface Meta {
  countries: Array<{ id: string; nameEn: string }>;
  cities: Array<{ id: string; countryId: string; nameEn: string }>;
  specialties: Array<{ id: string; nameEn: string }>;
  employmentTypes: Array<{ id: string; nameEn: string }>;
  salaryCurrencies: Array<{ code: string; symbol: string; nameEn: string }>;
  salaryPeriods: Array<{ id: string; nameEn: string }>;
}
interface JobData {
  id: string;
  referenceNumber: string;
  title: string;
  status: string;
  reviewNote: string | null;
  canEdit: boolean;
  aboutHospital: string | null;
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  positions: number;
  minYearsExperience: number | null;
  salaryMin: string | null;
  salaryMax: string | null;
  salaryCurrencyCode: string | null;
  salaryPeriodId: string | null;
  isUrgent: boolean;
  specialtyId: string;
  countryId: string;
  cityId: string;
  employmentTypeId: string;
}

const lines = (v: string[]) => v.join("\n");

export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [job, setJob] = useState<JobData | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ field?: string | null; message: string } | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetch("/api/auth/me", { credentials: "include" });
        const meJson = me.ok ? await me.json() : null;
        if (!meJson?.user || meJson.user.role !== "FACILITY") {
          router.replace(`/login/facility?returnTo=/dashboard/facility/jobs/${id}/edit`);
          return;
        }
        const [jobRes, metaRes] = await Promise.all([
          fetch(`/api/facility/jobs/${id}`, { credentials: "include" }),
          fetch("/api/facility/jobs/meta", { credentials: "include" }),
        ]);
        const jobJson = await jobRes.json();
        if (!jobRes.ok) throw new Error(jobJson.message || "Could not load this job.");
        const metaJson = await metaRes.json();
        const j: JobData = jobJson.job;
        setJob(j);
        setMeta(metaJson.referenceData ?? metaJson);
        setForm({
          title: j.title,
          aboutHospital: j.aboutHospital ?? "",
          specialtyId: j.specialtyId,
          positions: String(j.positions),
          minYearsExperience: j.minYearsExperience === null ? "" : String(j.minYearsExperience),
          employmentTypeId: j.employmentTypeId,
          countryId: j.countryId,
          cityId: j.cityId,
          salaryMin: j.salaryMin ?? "",
          salaryMax: j.salaryMax ?? "",
          salaryCurrencyCode: j.salaryCurrencyCode ?? "",
          salaryPeriodId: j.salaryPeriodId ?? "",
          description: j.description,
          responsibilities: lines(j.responsibilities),
          requirements: lines(j.requirements),
          benefits: lines(j.benefits),
          isUrgent: j.isUrgent,
        });
      } catch (e: any) {
        setLoadError(e.message || "Could not load this job.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const err = (k: string) => (error?.field === k ? error.message : null);
  const FieldError = ({ k }: { k: string }) => (err(k) ? <span role="alert" style={{ color: "#b91c1c", fontSize: 12.5, fontWeight: 600 }}>{err(k)}</span> : null);
  const bad = (k: string): React.CSSProperties => (err(k) ? { borderColor: "#dc2626" } : {});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/facility/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          positions: Number(form.positions) || 1,
          minYearsExperience: form.minYearsExperience === "" ? null : Number(form.minYearsExperience),
          salaryMin: form.salaryMin === "" ? null : Number(form.salaryMin),
          salaryMax: form.salaryMax === "" ? null : Number(form.salaryMax),
          salaryCurrencyCode: form.salaryCurrencyCode || null,
          salaryPeriodId: form.salaryPeriodId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        // everything the facility typed stays in the form
        setError({ field: json.field ?? null, message: json.message || "Could not resubmit the job." });
        return;
      }
      setDone(json.message);
    } catch {
      setError({ message: "A connection problem occurred. Your changes are still here; please try again." });
    } finally {
      setSaving(false);
    }
  };

  const cities = meta?.cities.filter((c) => c.countryId === form.countryId) ?? [];

  return (
    <div className={styles.portalContainer}>
      <SiteHeader content={defaultHeaderContent as any} activeHref="/dashboard/facility" />
      <main className={styles.portalMain} style={{ backgroundColor: "#f8fafc", padding: "40px 16px 64px 16px" }}>
        <div style={{ maxWidth: "780px", margin: "0 auto" }}>
          <div style={{ marginBottom: "20px" }}>
            <Link href="/dashboard/facility" style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600, color: "#1b8a8a", textDecoration: "none" }}>
              <ArrowLeft size={16} color="currentColor" />
              <span>Back to Facility Dashboard</span>
            </Link>
          </div>

          {loading ? (
            <p style={{ textAlign: "center", color: "#5b6e84" }}>Loading job...</p>
          ) : loadError ? (
            <div role="alert" style={{ padding: "14px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b" }}>{loadError}</div>
          ) : done ? (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "40px", textAlign: "center" }} role="status">
              <TickCircle size={44} color="#1b8a8a" variant="Bold" />
              <h1 style={{ fontSize: 26, color: "#0a2647", margin: "12px 0 8px" }}>Job resubmitted</h1>
              <p style={{ color: "#5b6e84" }}>{done}</p>
              <Link href="/dashboard/facility" className={styles.btnSolidTeal} style={{ display: "inline-block", marginTop: 16, padding: "12px 28px", textDecoration: "none" }}>Back to dashboard</Link>
            </div>
          ) : job && meta ? (
            <>
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <h1 style={{ fontSize: "32px", fontWeight: 700, color: "#0a2647", marginBottom: "8px", fontFamily: "var(--font-carlito, inherit)" }}>Edit and resubmit job</h1>
                <p style={{ fontSize: "16px", color: "#5b6e84" }}>{job.referenceNumber} · Update the details below and send the job back for platform review.</p>
              </div>

              {!job.canEdit ? (
                <div role="alert" style={{ padding: "14px 16px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, color: "#1e40af" }}>
                  This job can only be edited when the platform has asked for changes. Its current status is {job.status.toLowerCase().replace(/_/g, " ")}.
                </div>
              ) : (
                <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "36px 40px", boxShadow: "0 4px 16px rgba(10, 38, 71, 0.05)" }}>
                  {job.reviewNote && (
                    <div role="note" style={{ padding: "12px 16px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, color: "#9a3412", fontSize: 14, marginBottom: 20 }}>
                      <strong>The platform asked for these changes:</strong>
                      <p style={{ margin: "4px 0 0" }}>{job.reviewNote}</p>
                    </div>
                  )}
                  {error && !error.field && (
                    <div role="alert" style={{ display: "flex", gap: 10, padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b", fontSize: 14, marginBottom: 20 }}>
                      <InfoCircle size={18} color="#dc2626" variant="Bold" />
                      <span>{error.message}</span>
                    </div>
                  )}
                  <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
                    <div className={styles.formField}>
                      <label className={styles.formLabel} htmlFor="e-title">Job / Role Title *</label>
                      <input id="e-title" className={styles.formInput} style={bad("title")} value={form.title} onChange={(e) => set("title", e.target.value)} required />
                      <FieldError k="title" />
                    </div>
                    <div className={styles.formField}>
                      <label className={styles.formLabel} htmlFor="e-about">About the Hospital <span style={{ fontWeight: 400, color: "#64748b" }}>(shown anonymously on the public job page)</span></label>
                      <textarea id="e-about" className={styles.formTextarea} rows={3} value={form.aboutHospital} onChange={(e) => set("aboutHospital", e.target.value)} />
                      <FieldError k="aboutHospital" />
                    </div>
                    <div className={styles.formGrid}>
                      <div className={styles.formField}>
                        <label className={styles.formLabel} htmlFor="e-spec">Required Specialty *</label>
                        <select id="e-spec" className={styles.formInput} style={bad("specialtyId")} value={form.specialtyId} onChange={(e) => set("specialtyId", e.target.value)}>
                          {meta.specialties.map((s) => <option key={s.id} value={s.id}>{s.nameEn}</option>)}
                        </select>
                        <FieldError k="specialtyId" />
                      </div>
                      <div className={styles.formField}>
                        <label className={styles.formLabel} htmlFor="e-pos">Number of Positions *</label>
                        <input id="e-pos" type="number" min={1} max={100} className={styles.formInput} value={form.positions} onChange={(e) => set("positions", e.target.value)} />
                      </div>
                    </div>
                    <div className={styles.formGrid}>
                      <div className={styles.formField}>
                        <label className={styles.formLabel} htmlFor="e-exp">Minimum Experience (years)</label>
                        <input id="e-exp" type="number" min={0} className={styles.formInput} value={form.minYearsExperience} onChange={(e) => set("minYearsExperience", e.target.value)} />
                      </div>
                      <div className={styles.formField}>
                        <label className={styles.formLabel} htmlFor="e-type">Contract Type *</label>
                        <select id="e-type" className={styles.formInput} style={bad("employmentTypeId")} value={form.employmentTypeId} onChange={(e) => set("employmentTypeId", e.target.value)}>
                          {meta.employmentTypes.map((t) => <option key={t.id} value={t.id}>{t.nameEn}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className={styles.formGrid}>
                      <div className={styles.formField}>
                        <label className={styles.formLabel} htmlFor="e-country">Country *</label>
                        <select id="e-country" className={styles.formInput} value={form.countryId} onChange={(e) => { set("countryId", e.target.value); set("cityId", meta.cities.find((c) => c.countryId === e.target.value)?.id ?? ""); }}>
                          {meta.countries.map((c) => <option key={c.id} value={c.id}>{c.nameEn}</option>)}
                        </select>
                      </div>
                      <div className={styles.formField}>
                        <label className={styles.formLabel} htmlFor="e-city">City *</label>
                        <select id="e-city" className={styles.formInput} style={bad("cityId")} value={form.cityId} onChange={(e) => set("cityId", e.target.value)}>
                          {cities.map((c) => <option key={c.id} value={c.id}>{c.nameEn}</option>)}
                        </select>
                        <FieldError k="cityId" />
                      </div>
                    </div>
                    <div className={styles.formGrid}>
                      <div className={styles.formField}>
                        <label className={styles.formLabel} htmlFor="e-smin">Minimum Salary</label>
                        <input id="e-smin" type="number" min={0} className={styles.formInput} value={form.salaryMin} onChange={(e) => set("salaryMin", e.target.value)} />
                      </div>
                      <div className={styles.formField}>
                        <label className={styles.formLabel} htmlFor="e-smax">Maximum Salary</label>
                        <input id="e-smax" type="number" min={0} className={styles.formInput} value={form.salaryMax} onChange={(e) => set("salaryMax", e.target.value)} />
                      </div>
                    </div>
                    <div className={styles.formField}>
                      <label className={styles.formLabel} htmlFor="e-desc">Job Description *</label>
                      <textarea id="e-desc" className={styles.formTextarea} style={bad("description")} rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} required />
                      <FieldError k="description" />
                    </div>
                    {([["responsibilities", "Key Responsibilities"], ["requirements", "Requirements"], ["benefits", "Benefits & Perks"]] as const).map(([k, label]) => (
                      <div className={styles.formField} key={k}>
                        <label className={styles.formLabel} htmlFor={`e-${k}`}>{label} <span style={{ fontWeight: 400, color: "#64748b" }}>(one per line)</span></label>
                        <textarea id={`e-${k}`} className={styles.formTextarea} style={bad(k)} rows={4} value={form[k]} onChange={(e) => set(k, e.target.value)} />
                        <FieldError k={k} />
                      </div>
                    ))}
                    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 600, color: "#0a2647" }}>
                      <input type="checkbox" checked={form.isUrgent} onChange={(e) => set("isUrgent", e.target.checked)} /> Mark this job as Urgently Hiring
                    </label>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                      <Link href="/dashboard/facility" style={{ padding: "14px 24px", fontWeight: 700, color: "#475569", textDecoration: "none" }}>Cancel</Link>
                      <button type="submit" disabled={saving} className={styles.btnSolidTeal} style={{ padding: "14px 36px", fontSize: 15, fontWeight: 700, backgroundColor: "#1b8a8a", color: "#fff", borderRadius: 8, border: "none", opacity: saving ? 0.7 : 1, cursor: saving ? "not-allowed" : "pointer" }}>
                        {saving ? "Resubmitting..." : "Resubmit for review"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          ) : null}
        </div>
      </main>
      <SimpleAuthFooter />
    </div>
  );
}
