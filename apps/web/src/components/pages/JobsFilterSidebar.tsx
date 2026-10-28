"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import styles from "./pages.module.css";

type FilterOptions = {
  specialties: { value: string; label: string }[];
  countries: { value: string; label: string }[];
  employmentTypes: { value: string; label: string }[];
  experienceLevels: { value: string; label: string }[];
};

export function JobsFilterSidebar({ options }: { options: FilterOptions }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const selectedSpecialties = searchParams.get("specialty")?.split(",") || [];
  const selectedCountry = searchParams.get("country") || "";
  const selectedType = searchParams.get("type") || "";
  const selectedExperience = searchParams.get("experience") || "";

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      if (!value) {
        current.delete(key);
      } else {
        current.set(key, value);
      }
      current.delete("page"); // Reset to page 1 on filter change
      startTransition(() => {
        router.push(`/jobs?${current.toString()}`);
      });
    },
    [router, searchParams]
  );

  const toggleSpecialty = useCallback(
    (slug: string) => {
      let updated: string[];
      if (selectedSpecialties.includes(slug)) {
        updated = selectedSpecialties.filter((s) => s !== slug);
      } else {
        updated = [...selectedSpecialties, slug];
      }
      updateParam("specialty", updated.length > 0 ? updated.join(",") : null);
    },
    [selectedSpecialties, updateParam]
  );

  const clearAll = useCallback(() => {
    startTransition(() => {
      router.push("/jobs");
    });
  }, [router]);

  const hasFilters =
    selectedSpecialties.length > 0 ||
    Boolean(selectedCountry) ||
    Boolean(selectedType) ||
    Boolean(selectedExperience);

  return (
    <aside className={styles.filtersCard}>
      <h3 className={styles.filtersTitle}>Filters</h3>

      {/* SPECIALTY */}
      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>Specialty</span>
        <div className={styles.checkboxList}>
          {options.specialties.map((s) => (
            <label key={s.value} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={selectedSpecialties.includes(s.value)}
                onChange={() => toggleSpecialty(s.value)}
              />
              <span>{s.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* COUNTRY */}
      <div className={styles.filterGroup}>
        <label htmlFor="filter-country" className={styles.filterLabel}>
          Country
        </label>
        <select
          id="filter-country"
          className={styles.filterSelect}
          value={selectedCountry}
          onChange={(e) => updateParam("country", e.target.value || null)}
        >
          <option value="">Select Option</option>
          {options.countries.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* JOB TYPE */}
      <div className={styles.filterGroup}>
        <label htmlFor="filter-type" className={styles.filterLabel}>
          Job Type
        </label>
        <select
          id="filter-type"
          className={styles.filterSelect}
          value={selectedType}
          onChange={(e) => updateParam("type", e.target.value || null)}
        >
          <option value="">Select Option</option>
          {options.employmentTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* EXPERIENCE LEVEL */}
      <div className={styles.filterGroup}>
        <label htmlFor="filter-experience" className={styles.filterLabel}>
          Experience Level
        </label>
        <select
          id="filter-experience"
          className={styles.filterSelect}
          value={selectedExperience}
          onChange={(e) => updateParam("experience", e.target.value || null)}
        >
          <option value="">Select Option</option>
          {options.experienceLevels.map((exp) => (
            <option key={exp.value} value={exp.value}>
              {exp.label}
            </option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button type="button" onClick={clearAll} className={styles.clearFiltersBtn}>
          Clear All Filters
        </button>
      )}
    </aside>
  );
}
