import React, { useEffect, useState } from "react";
import type { JobSubmissionItem, JobQueueMeta, JobModerationStatus } from "../types";
import { getJobSubmissions } from "../api";
import { useRouter } from "../router";

export function JobQueuePage() {
  const { navigate, search } = useRouter();

  // Parse query parameters
  const searchParams = new URLSearchParams(search);
  const currentStatus = (searchParams.get("status") || "ALL") as "ALL" | JobModerationStatus;
  const currentSearch = searchParams.get("search") || "";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<JobSubmissionItem[]>([]);
  const [meta, setMeta] = useState<JobQueueMeta>({
    counts: { all: 0, pendingReview: 0, published: 0, rejected: 0 },
  });
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchInput, setSearchInput] = useState(currentSearch);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    getJobSubmissions({
      status: currentStatus,
      search: currentSearch,
      page: currentPage,
      limit: 10,
    })
      .then((res) => {
        if (mounted) {
          setItems(res.jobs);
          setMeta(res.meta);
          setTotalPages(res.pagination.totalPages);
          setTotalCount(res.pagination.total);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load job submissions queue:", err);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [currentStatus, currentSearch, currentPage]);

  const updateFilters = (newStatus?: string, newSearch?: string, newPage: number = 1) => {
    const params = new URLSearchParams();
    const s = newStatus !== undefined ? newStatus : currentStatus;
    const q = newSearch !== undefined ? newSearch : currentSearch;

    if (s && s !== "ALL") params.set("status", s);
    if (q) params.set("search", q);
    if (newPage > 1) params.set("page", String(newPage));

    navigate(`/jobs${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters(undefined, searchInput.trim(), 1);
  };

  const getStatusBadgeClass = (status: JobModerationStatus) => {
    switch (status) {
      case "PENDING_REVIEW":
        return "badgePending";
      case "PUBLISHED":
        return "badgeApproved";
      case "REJECTED":
        return "badgeRejected";
      case "CHANGES_REQUESTED":
        return "badgeWarning";
      default:
        return "badgeDraft";
    }
  };

  const formatStatusLabel = (status: JobModerationStatus) => {
    switch (status) {
      case "PENDING_REVIEW":
        return "Pending Review";
      case "PUBLISHED":
        return "Published";
      case "REJECTED":
        return "Rejected";
      case "CHANGES_REQUESTED":
        return "Changes Requested";
      case "CLOSED":
        return "Closed";
      default:
        return status;
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="reviewQueuePage">
      {/* Page Header */}
      <div className="pageHeaderSection">
        <div>
          <h1 className="pageHeaderTitle">Job Requisitions Moderation Queue</h1>
          <p className="pageHeaderSubtitle">
            Review submitted clinical job openings, verify healthcare facility and recruitment officer credentials, and approve for anonymous publication.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="queueFiltersCard">
        <div className="filterTabsRow">
          <button
            type="button"
            className={`filterTabBtn ${currentStatus === "ALL" ? "filterTabActive" : ""}`}
            onClick={() => updateFilters("ALL", undefined, 1)}
          >
            <span>All Submissions</span>
            <span className="tabCounterPill">{meta.counts.all}</span>
          </button>

          <button
            type="button"
            className={`filterTabBtn ${currentStatus === "PENDING_REVIEW" ? "filterTabActive" : ""}`}
            onClick={() => updateFilters("PENDING_REVIEW", undefined, 1)}
          >
            <span className="tabDot pendingDot" />
            <span>Pending Review</span>
            {meta.counts.pendingReview > 0 && (
              <span className="tabCounterPill alertPill">{meta.counts.pendingReview}</span>
            )}
          </button>

          <button
            type="button"
            className={`filterTabBtn ${currentStatus === "PUBLISHED" ? "filterTabActive" : ""}`}
            onClick={() => updateFilters("PUBLISHED", undefined, 1)}
          >
            <span className="tabDot approvedDot" />
            <span>Published</span>
            <span className="tabCounterPill">{meta.counts.published}</span>
          </button>

          <button
            type="button"
            className={`filterTabBtn ${currentStatus === "REJECTED" ? "filterTabActive" : ""}`}
            onClick={() => updateFilters("REJECTED", undefined, 1)}
          >
            <span className="tabDot rejectedDot" />
            <span>Rejected</span>
            <span className="tabCounterPill">{meta.counts.rejected}</span>
          </button>
        </div>

        {/* Search Bar */}
        <form className="searchRowForm" onSubmit={handleSearchSubmit}>
          <div className="searchBoxWrapper">
            <svg
              className="searchIcon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="searchFilterInput"
              placeholder="Search by role title, job reference, facility name, recruiter..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                type="button"
                className="clearSearchBtn"
                onClick={() => {
                  setSearchInput("");
                  updateFilters(undefined, "", 1);
                }}
                aria-label="Clear search query"
              >
                ×
              </button>
            )}
          </div>
          <button type="submit" className="searchSubmitBtn">
            Search
          </button>
        </form>
      </div>

      {/* Queue Table */}
      <div className="tableContainerCard">
        {loading ? (
          <div className="tableLoadingState">
            <div className="spinnerRing" />
            <span>Loading job requisitions...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="tableEmptyState">
            <div className="emptyStateIconBox">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
            <h3 className="emptyStateTitle">No Job Submissions Found</h3>
            <p className="emptyStateSubtitle">
              {currentSearch
                ? `No results match your query "${currentSearch}". Try refining your search terms.`
                : currentStatus !== "ALL"
                ? `There are currently no job submissions with status "${currentStatus}".`
                : "No facility job submissions have been logged yet."}
            </p>
          </div>
        ) : (
          <div className="tableScrollWrapper">
            <table className="queueDataTable">
              <thead>
                <tr>
                  <th style={{ width: "21%" }}>Job Role & Reference</th>
                  <th style={{ width: "21%" }}>Healthcare Facility & Recruiter</th>
                  <th style={{ width: "15%" }}>Specialty & Location</th>
                  <th style={{ width: "16%" }}>Positions & Compensation</th>
                  <th style={{ width: "11%" }}>Review Status</th>
                  <th style={{ width: "10%" }}>Submitted At</th>
                  <th style={{ width: "6%", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((job) => (
                  <tr key={job.id} className="queueTableRow">
                    {/* Role Title & Ref */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "12px", fontFamily: "monospace", color: "#0f766e", fontWeight: 700 }}>
                            {job.referenceNumber}
                          </span>
                          {job.isUrgent && (
                            <span style={{ fontSize: "11px", backgroundColor: "#fff1f2", color: "#e11d48", padding: "1px 6px", borderRadius: "10px", fontWeight: 700 }}>
                              🔥 Urgent
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--navy)" }}>
                          {job.title}
                        </span>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          Term: {job.employmentType}
                        </span>
                      </div>
                    </td>

                    {/* Facility & Recruitment Officer */}
                    <td>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "6px",
                            backgroundColor: "#e0f2fe",
                            color: "#0369a1",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "13px",
                            flexShrink: 0,
                            position: "relative",
                            overflow: "hidden",
                          }}
                        >
                          {job.facility.name.slice(0, 2).toUpperCase()}
                          {job.facility.logoUrl && (
                            <img
                              src={job.facility.logoUrl}
                              alt=""
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                              }}
                              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--navy)" }}>
                            {job.facility.name}
                          </span>
                          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            Recruiter: <strong>{job.facility.officerName}</strong>
                          </span>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>
                            {job.facility.loginEmail || job.facility.hospitalEmail}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Specialty & Location */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--navy)" }}>
                          {job.specialty}
                        </span>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          📍 {job.location}
                        </span>
                      </div>
                    </td>

                    {/* Positions & Salary */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--navy)" }}>
                          {job.positions} position{job.positions > 1 ? "s" : ""}
                        </span>
                        <span style={{ fontSize: "12px", color: "#047857", fontWeight: 600 }}>
                          {job.salary || "Competitive"}
                        </span>
                        {job.minYearsExperience !== null && (
                          <span style={{ fontSize: "11px", color: "#64748b" }}>
                            Min {job.minYearsExperience}+ yrs exp
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td>
                      <span className={`statusBadge ${getStatusBadgeClass(job.status)}`}>
                        {formatStatusLabel(job.status)}
                      </span>
                    </td>

                    {/* Submitted At */}
                    <td>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {formatDate(job.submittedAt || job.publishedAt)}
                      </span>
                    </td>

                    {/* Action */}
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="reviewBtn"
                        onClick={() => navigate(`/jobs/${job.id}`)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="tablePaginationFooter">
            <span className="paginationSummaryText">
              Showing page {currentPage} of {totalPages} ({totalCount} total requisitions)
            </span>
            <div className="paginationControls">
              <button
                type="button"
                className="pageNavBtn"
                disabled={currentPage <= 1}
                onClick={() => updateFilters(undefined, undefined, currentPage - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="pageNavBtn"
                disabled={currentPage >= totalPages}
                onClick={() => updateFilters(undefined, undefined, currentPage + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
