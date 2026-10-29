import React, { useEffect, useState } from "react";
import type { AdminApplicationItem, ApplicationStatus } from "../types";
import { getAdminApplications } from "../api";
import { useRouter } from "../router";

const STATUS_TABS: Array<{ key: "ALL" | ApplicationStatus; label: string; dot?: string }> = [
  { key: "ALL", label: "All Applications" },
  { key: "SUBMITTED", label: "Submitted", dot: "pendingDot" },
  { key: "UNDER_REVIEW", label: "Under Review", dot: "pendingDot" },
  { key: "HIRE_REQUESTED", label: "Hire Requested", dot: "doctorDot" },
  { key: "HIRED", label: "Hired", dot: "approvedDot" },
  { key: "NOT_SELECTED", label: "Not Selected", dot: "rejectedDot" },
  { key: "WITHDRAWN", label: "Withdrawn", dot: "rejectedDot" },
];

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  HIRE_REQUESTED: "Hire Requested",
  HIRED: "Hired",
  NOT_SELECTED: "Not Selected",
  WITHDRAWN: "Withdrawn",
};

const STATUS_BADGE: Record<string, string> = {
  SUBMITTED: "badgePending",
  UNDER_REVIEW: "badgeWarning",
  HIRE_REQUESTED: "badgeWarning",
  HIRED: "badgeApproved",
  NOT_SELECTED: "badgeRejected",
  WITHDRAWN: "badgeDraft",
};

const humanize = (value: string | null | undefined) =>
  value ? value.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : "";

export function ApplicationsQueuePage() {
  const { navigate, search } = useRouter();
  const searchParams = new URLSearchParams(search);
  const currentStatus = (searchParams.get("status") || "ALL") as "ALL" | ApplicationStatus;
  const currentSearch = searchParams.get("search") || "";
  const currentJobId = searchParams.get("jobId") || "";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AdminApplicationItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({ ALL: 0 });
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [searchInput, setSearchInput] = useState(currentSearch);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    getAdminApplications({ status: currentStatus, search: currentSearch, jobId: currentJobId, page: currentPage, limit: 20 })
      .then((res) => {
        if (!mounted) return;
        setItems(res.items);
        setCounts(res.meta.counts);
        setMeta(res.meta);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || "Failed to load applications.");
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [currentStatus, currentSearch, currentJobId, currentPage]);

  const updateFilters = (newStatus?: string, newSearch?: string, newPage: number = 1) => {
    const params = new URLSearchParams();
    const s = newStatus !== undefined ? newStatus : currentStatus;
    const q = newSearch !== undefined ? newSearch : currentSearch;
    if (s && s !== "ALL") params.set("status", s);
    if (q) params.set("search", q);
    if (currentJobId) params.set("jobId", currentJobId);
    if (newPage > 1) params.set("page", String(newPage));
    navigate(`/applications${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const filteredJobTitle = currentJobId ? items[0]?.job.title : null;

  return (
    <div className="reviewQueuePage">
      <div className="pageHeaderSection">
        <div>
          <h1 className="pageHeaderTitle">Doctor Applications</h1>
          <p className="pageHeaderSubtitle">
            Every application with the applying doctor, the job, and the facility. Facilities only see the anonymous
            candidate code, job title, specialty, and years of experience until an identity release is approved with
            the doctor&apos;s consent.
          </p>
        </div>
      </div>

      {currentJobId && (
        <div className="noticeBanner pendingBanner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <span>
            Showing applications for {filteredJobTitle ? <strong>{filteredJobTitle}</strong> : "one job"}.
          </span>
          <button type="button" className="emptyStateResetBtn" onClick={() => navigate("/applications")}>
            Show all jobs
          </button>
        </div>
      )}

      <div className="queueFiltersCard">
        <div className="filterTabsRow" role="tablist" aria-label="Application status">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={currentStatus === tab.key}
              className={`filterTabBtn ${currentStatus === tab.key ? "filterTabActive" : ""}`}
              onClick={() => updateFilters(tab.key, undefined, 1)}
            >
              {tab.dot && <span className={`tabDot ${tab.dot}`} />}
              <span>{tab.label}</span>
              <span className="tabCounterPill">{counts[tab.key] ?? 0}</span>
            </button>
          ))}
        </div>

        <form
          className="queueSearchForm"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            updateFilters(undefined, searchInput.trim(), 1);
          }}
        >
          <div className="searchFieldWrap">
            <svg className="searchIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="queueSearchInput"
              placeholder="Search by doctor, candidate code, job title, or facility..."
              aria-label="Search applications"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <button type="submit" className="queueSearchBtn">
            Search
          </button>
        </form>
      </div>

      <div className="queueTableCard">
        {loading ? (
          <div className="tableLoadingState">
            <div className="tableSpinner" />
            <p>Loading applications...</p>
          </div>
        ) : error ? (
          <div className="tableEmptyState">
            <h3 className="emptyStateTitle">Could not load applications</h3>
            <p className="emptyStateSubtitle">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="tableEmptyState">
            <h3 className="emptyStateTitle">No Applications Found</h3>
            <p className="emptyStateSubtitle">
              {currentSearch || currentStatus !== "ALL"
                ? "No applications match the current filters."
                : "No doctor has applied to a published job yet."}
            </p>
            {(currentSearch || currentStatus !== "ALL") && (
              <button
                type="button"
                className="emptyStateResetBtn"
                onClick={() => {
                  setSearchInput("");
                  updateFilters("ALL", "", 1);
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="tableResponsiveWrap">
            <table className="queueTable">
              <thead>
                <tr>
                  <th>Doctor (platform only)</th>
                  <th>Job</th>
                  <th>Facility &amp; Recruitment Contact</th>
                  <th>Application</th>
                  <th>Hire Request / Identity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="facilityNameCell">
                        <strong>{a.doctor.fullName}</strong>
                        {a.doctor.mobileE164 && <span style={{ fontSize: "12px", color: "#475569" }}>{a.doctor.mobileE164}</span>}
                        {a.doctor.email && <span style={{ fontSize: "12px", color: "#475569" }}>{a.doctor.email}</span>}
                        <span className="subRefId" title="Anonymous code shown to the facility">
                          {a.candidateCode} · {a.anonymous.specialty} · {a.anonymous.yearsOfExperience} yrs
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="facilityNameCell">
                        <strong>{a.job.title}</strong>
                        <span className="subRefId">
                          {a.job.ref} · {humanize(a.job.status)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="facilityNameCell">
                        <strong>{a.facility.name}</strong>
                        <span style={{ fontSize: "12px", color: "#475569" }}>
                          {a.facility.recruitmentContact.name}
                          {a.facility.recruitmentContact.phone ? ` · ${a.facility.recruitmentContact.phone}` : ""}
                        </span>
                        {a.facility.recruitmentContact.email && (
                          <span style={{ fontSize: "12px", color: "#475569" }}>{a.facility.recruitmentContact.email}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`statusPill ${STATUS_BADGE[a.status] ?? "badgeDraft"}`}>{STATUS_LABEL[a.status] ?? a.status}</span>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                        {new Date(a.submittedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                      </div>
                    </td>
                    <td>
                      {a.hireRequest ? (
                        <div style={{ fontSize: "12px", color: "#334155", display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span>
                            Request: <strong>{humanize(a.hireRequest.requestStatus)}</strong>
                          </span>
                          <span>Candidate: {humanize(a.hireRequest.itemStatus)}</span>
                          {a.hireRequest.identityReleaseStatus && (
                            <span>
                              Identity: {humanize(a.hireRequest.identityReleaseStatus)} · consent{" "}
                              {humanize(a.hireRequest.doctorConsentStatus)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "13px" }}>No hire request yet</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-start" }}>
                        <button type="button" className="btnReviewAction" onClick={() => navigate(`/applications/${a.id}`)}>
                          Details
                        </button>
                        <button type="button" className="btnReviewAction" onClick={() => navigate(`/accounts/${a.doctor.accountId}`)}>
                          Doctor
                        </button>
                        <button type="button" className="btnReviewAction" onClick={() => navigate(`/jobs/${a.job.id}`)}>
                          Job
                        </button>
                        {a.hireRequest && (
                          <button type="button" className="btnReviewAction" onClick={() => navigate("/hire-requests")}>
                            Hire request
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta.totalPages > 1 && (
          <div className="tablePaginationFooter">
            <span>
              Page {meta.page} of {meta.totalPages} ({meta.total} applications)
            </span>
            <div className="paginationBtnGroup">
              <button type="button" className="paginationBtn" disabled={meta.page <= 1} onClick={() => updateFilters(undefined, undefined, meta.page - 1)}>
                Previous
              </button>
              <button type="button" className="paginationBtn" disabled={meta.page >= meta.totalPages} onClick={() => updateFilters(undefined, undefined, meta.page + 1)}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
