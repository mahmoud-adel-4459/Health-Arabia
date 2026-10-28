import type { ReviewQueueMeta } from "../types";

interface KpiStatsBarProps {
  counts: ReviewQueueMeta["counts"];
  activeRole: string;
  activeStatus: string;
  onSelectFilter: (role: "ALL" | "DOCTOR" | "FACILITY", status: "ALL" | "PENDING_REVIEW" | "APPROVED" | "REJECTED") => void;
}

export function KpiStatsBar({ counts, activeRole, activeStatus, onSelectFilter }: KpiStatsBarProps) {
  return (
    <section className="kpiGrid" aria-label="Review summary metrics">
      {/* 1. All Pending */}
      <div
        className={`kpiCard ${activeStatus === "PENDING_REVIEW" && activeRole === "ALL" ? "kpiCardActive" : ""}`}
        onClick={() => onSelectFilter("ALL", "PENDING_REVIEW")}
        role="button"
        tabIndex={0}
      >
        <div className="kpiLabelRow">
          <span className="kpiLabel">Pending Review</span>
          <div className="kpiIconWrapper" style={{ backgroundColor: "#fef3c7", color: "#d97706" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
        </div>
        <div className="kpiValue">{counts.pending}</div>
        <div className="kpiSubtitle">Accounts awaiting administrative review</div>
      </div>

      {/* 2. Doctors Pending */}
      <div
        className={`kpiCard ${activeStatus === "PENDING_REVIEW" && activeRole === "DOCTOR" ? "kpiCardActive" : ""}`}
        onClick={() => onSelectFilter("DOCTOR", "PENDING_REVIEW")}
        role="button"
        tabIndex={0}
      >
        <div className="kpiLabelRow">
          <span className="kpiLabel">Doctors Pending</span>
          <div className="kpiIconWrapper" style={{ backgroundColor: "#e0f2fe", color: "#0369a1" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </div>
        <div className="kpiValue">{counts.doctorsPending}</div>
        <div className="kpiSubtitle">Clinicians & specialists pending check</div>
      </div>

      {/* 3. Facilities Pending */}
      <div
        className={`kpiCard ${activeStatus === "PENDING_REVIEW" && activeRole === "FACILITY" ? "kpiCardActive" : ""}`}
        onClick={() => onSelectFilter("FACILITY", "PENDING_REVIEW")}
        role="button"
        tabIndex={0}
      >
        <div className="kpiLabelRow">
          <span className="kpiLabel">Facilities Pending</span>
          <div className="kpiIconWrapper" style={{ backgroundColor: "#ede9fe", color: "#6d28d9" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
              <path d="M9 22v-4h6v4" />
              <path d="M8 6h.01" />
              <path d="M16 6h.01" />
              <path d="M8 10h.01" />
              <path d="M16 10h.01" />
              <path d="M8 14h.01" />
              <path d="M16 14h.01" />
            </svg>
          </div>
        </div>
        <div className="kpiValue">{counts.facilitiesPending}</div>
        <div className="kpiSubtitle">Hospitals & clinics pending check</div>
      </div>

      {/* 4. Total Approved */}
      <div
        className={`kpiCard ${activeStatus === "APPROVED" ? "kpiCardActive" : ""}`}
        onClick={() => onSelectFilter("ALL", "APPROVED")}
        role="button"
        tabIndex={0}
      >
        <div className="kpiLabelRow">
          <span className="kpiLabel">Approved</span>
          <div className="kpiIconWrapper" style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        </div>
        <div className="kpiValue">{counts.approved}</div>
        <div className="kpiSubtitle">Active verified platform accounts</div>
      </div>

      {/* 5. Total Rejected */}
      <div
        className={`kpiCard ${activeStatus === "REJECTED" ? "kpiCardActive" : ""}`}
        onClick={() => onSelectFilter("ALL", "REJECTED")}
        role="button"
        tabIndex={0}
      >
        <div className="kpiLabelRow">
          <span className="kpiLabel">Rejected</span>
          <div className="kpiIconWrapper" style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
        </div>
        <div className="kpiValue">{counts.rejected}</div>
        <div className="kpiSubtitle">Declined or non-conforming submissions</div>
      </div>
    </section>
  );
}
