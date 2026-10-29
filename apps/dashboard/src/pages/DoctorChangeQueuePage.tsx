import React, { useEffect, useState } from "react";
import type { DoctorChangeQueueItem, ProfileChangeRequestStatus } from "../types";
import { getDoctorChangeRequests } from "../api";
import { useRouter } from "../router";

export function DoctorChangeQueuePage() {
  const { navigate, search } = useRouter();

  // Parse query parameters
  const searchParams = new URLSearchParams(search);
  const currentStatus = (searchParams.get("status") || "ALL") as "ALL" | ProfileChangeRequestStatus;
  const currentSearch = searchParams.get("search") || "";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<DoctorChangeQueueItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    CANCELLED: 0,
    ALL: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [searchInput, setSearchInput] = useState(currentSearch);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    getDoctorChangeRequests({
      status: currentStatus,
      search: currentSearch,
      page: currentPage,
      limit: 10,
    })
      .then((res) => {
        if (mounted) {
          setItems(res.requests);
          setCounts(res.counts);
          setPagination(res.pagination);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load doctor change queue:", err);
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

    navigate(`/doctor-changes${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters(undefined, searchInput.trim(), 1);
  };

  const getStatusBadgeClass = (status: ProfileChangeRequestStatus) => {
    switch (status) {
      case "PENDING":
        return "badgePending";
      case "APPROVED":
        return "badgeApproved";
      case "REJECTED":
        return "badgeRejected";
      default:
        return "badgeDraft";
    }
  };

  return (
    <div className="reviewQueuePage">
      {/* Page Header */}
      <div className="pageHeaderSection">
        <div>
          <h1 className="pageHeaderTitle">Doctor Profile Change Queue</h1>
          <p className="pageHeaderSubtitle">
            Review proposed profile updates, qualifications, licenses, experience, and documents submitted by registered doctors.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Controls (same components as the facility change queue) */}
      <div className="queueFiltersCard">
        <div className="filterTabsRow" role="tablist" aria-label="Request status">
          <button
            type="button"
            role="tab"
            aria-selected={currentStatus === "ALL"}
            className={`filterTabBtn ${currentStatus === "ALL" ? "filterTabActive" : ""}`}
            onClick={() => updateFilters("ALL", undefined, 1)}
          >
            <span>All Requests</span>
            <span className="tabCounterPill">{counts.ALL || 0}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={currentStatus === "PENDING"}
            className={`filterTabBtn ${currentStatus === "PENDING" ? "filterTabActive" : ""}`}
            onClick={() => updateFilters("PENDING", undefined, 1)}
          >
            <span className="tabDot pendingDot" />
            <span>Pending Review</span>
            <span className={`tabCounterPill ${(counts.PENDING || 0) > 0 ? "alertPill" : ""}`}>
              {counts.PENDING || 0}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={currentStatus === "APPROVED"}
            className={`filterTabBtn ${currentStatus === "APPROVED" ? "filterTabActive" : ""}`}
            onClick={() => updateFilters("APPROVED", undefined, 1)}
          >
            <span className="tabDot approvedDot" />
            <span>Approved</span>
            <span className="tabCounterPill">{counts.APPROVED || 0}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={currentStatus === "REJECTED"}
            className={`filterTabBtn ${currentStatus === "REJECTED" ? "filterTabActive" : ""}`}
            onClick={() => updateFilters("REJECTED", undefined, 1)}
          >
            <span className="tabDot rejectedDot" />
            <span>Declined</span>
            <span className="tabCounterPill">{counts.REJECTED || 0}</span>
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="queueSearchForm" role="search">
          <div className="searchFieldWrap">
            <svg
              className="searchIcon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#64748b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by doctor name, email, or mobile..."
              aria-label="Search doctor profile change requests"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="queueSearchInput"
            />
          </div>
          <button type="submit" className="queueSearchBtn">
            Search
          </button>
        </form>
      </div>

      {/* Main Table Content */}
      <div className="queueTableCard">
        {loading ? (
          <div className="tableLoadingState">
            <div className="tableSpinner" />
            <p>Loading doctor profile change requests...</p>
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
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <h3 className="emptyStateTitle">No Doctor Profile Change Requests Found</h3>
            <p className="emptyStateSubtitle">
              {currentSearch || currentStatus !== "ALL"
                ? "No change requests match the current filters. Try resetting search or selecting another status."
                : "There are currently no doctor profile change requests awaiting platform review."}
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
                  <th>Doctor Candidate</th>
                  <th>Specialty &amp; Position</th>
                  <th>Contact Identifier</th>
                  <th>Changed Fields</th>
                  <th>Submission Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="facilityNameCell">
                        <strong>{r.doctorName}</strong>
                        <span className="subRefId">Ref: {r.id.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td>{r.jobTitle}</td>
                    <td>
                      <div>
                        {r.email && <div>{r.email}</div>}
                        {r.mobileE164 && <div style={{ fontSize: "12px", color: "#64748b" }}>{r.mobileE164}</div>}
                      </div>
                    </td>
                    <td>
                      <span className="changedFieldsBadge">
                        {r.changedFieldCount} {r.changedFieldCount === 1 ? "field" : "fields"} modified
                      </span>
                    </td>
                    <td>{new Date(r.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</td>
                    <td>
                      <span className={`statusPill ${getStatusBadgeClass(r.status)}`}>
                        {r.status === "PENDING"
                          ? "Pending Review"
                          : r.status === "APPROVED"
                          ? "Approved"
                          : r.status === "REJECTED"
                          ? "Declined"
                          : r.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btnReviewAction"
                        onClick={() => navigate(`/doctor-changes/${r.id}`)}
                      >
                        Review Diff
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="tablePaginationFooter">
            <span>
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} requests
            </span>
            <div className="paginationBtnGroup">
              <button
                type="button"
                className="paginationBtn"
                disabled={pagination.page <= 1}
                onClick={() => updateFilters(undefined, undefined, pagination.page - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="paginationBtn"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => updateFilters(undefined, undefined, pagination.page + 1)}
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
