import React, { useEffect, useState } from "react";
import type { FacilityChangeQueueItem, FacilityChangeQueueMeta, ProfileChangeRequestStatus } from "../types";
import { getFacilityChangeRequests } from "../api";
import { useRouter } from "../router";

export function FacilityChangeQueuePage() {
  const { navigate, search } = useRouter();

  // Parse query parameters
  const searchParams = new URLSearchParams(search);
  const currentStatus = (searchParams.get("status") || "ALL") as "ALL" | ProfileChangeRequestStatus;
  const currentSearch = searchParams.get("search") || "";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FacilityChangeQueueItem[]>([]);
  const [meta, setMeta] = useState<FacilityChangeQueueMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    counts: { PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0, ALL: 0 },
  });
  const [searchInput, setSearchInput] = useState(currentSearch);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    getFacilityChangeRequests({
      status: currentStatus,
      search: currentSearch,
      page: currentPage,
      limit: 10,
    })
      .then((res) => {
        if (mounted) {
          setItems(res.data);
          setMeta(res.meta);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load facility change queue:", err);
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

    navigate(`/facility-changes${params.toString() ? `?${params.toString()}` : ""}`);
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
          <h1 className="pageHeaderTitle">Facility Profile Change Requests</h1>
          <p className="pageHeaderSubtitle">
            Review field-by-field profile change submissions from healthcare facilities before publishing updates live.
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
            <span>All Requests</span>
            <span className="tabCounterPill">{meta.counts.ALL}</span>
          </button>
          <button
            type="button"
            className={`filterTabBtn ${currentStatus === "PENDING" ? "filterTabActive" : ""}`}
            onClick={() => updateFilters("PENDING", undefined, 1)}
          >
            <span className="tabDot pendingDot" />
            <span>Pending Review</span>
            {meta.counts.PENDING > 0 ? (
              <span className="tabCounterPill alertPill">{meta.counts.PENDING}</span>
            ) : (
              <span className="tabCounterPill">{meta.counts.PENDING}</span>
            )}
          </button>
          <button
            type="button"
            className={`filterTabBtn ${currentStatus === "APPROVED" ? "filterTabActive" : ""}`}
            onClick={() => updateFilters("APPROVED", undefined, 1)}
          >
            <span className="tabDot approvedDot" />
            <span>Approved</span>
            <span className="tabCounterPill">{meta.counts.APPROVED}</span>
          </button>
          <button
            type="button"
            className={`filterTabBtn ${currentStatus === "REJECTED" ? "filterTabActive" : ""}`}
            onClick={() => updateFilters("REJECTED", undefined, 1)}
          >
            <span className="tabDot rejectedDot" />
            <span>Rejected</span>
            <span className="tabCounterPill">{meta.counts.REJECTED}</span>
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="queueSearchForm">
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
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by facility name, officer, or email..."
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
            <p>Loading facility change requests...</p>
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <h3 className="emptyStateTitle">No Change Requests Found</h3>
            <p className="emptyStateSubtitle">
              {currentSearch
                ? `No change requests match your search "${currentSearch}".`
                : currentStatus !== "ALL"
                ? `There are currently no profile change requests with status "${currentStatus}".`
                : "No facility profile change requests have been submitted yet."}
            </p>
            {(currentStatus !== "ALL" || currentSearch) && (
              <button
                type="button"
                className="emptyStateResetBtn"
                onClick={() => {
                  setSearchInput("");
                  updateFilters("ALL", "", 1);
                }}
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="tableResponsiveWrap">
            <table className="queueTable">
              <thead>
                <tr>
                  <th>Hospital / Facility</th>
                  <th>Officer Contact</th>
                  <th>Submitted At</th>
                  <th>Status</th>
                  <th>Changes</th>
                  <th>Decision / Reviewer</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="facilityNameCell">
                        <strong>{r.facilityName}</strong>
                        <span className="subRefId">Ref: {r.id.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div>{r.officerName}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>{r.officerEmail}</div>
                      </div>
                    </td>
                    <td>{new Date(r.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</td>
                    <td>
                      <span className={`statusPill ${getStatusBadgeClass(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <span className="changedFieldsBadge">
                        {r.changedFieldCount} {r.changedFieldCount === 1 ? "field" : "fields"} modified
                      </span>
                    </td>
                    <td>
                      {r.reviewer ? (
                        <div style={{ fontSize: "13px" }}>
                          <div>{r.reviewer.name}</div>
                          {r.reviewedAt && (
                            <div style={{ fontSize: "11px", color: "#64748b" }}>
                              {new Date(r.reviewedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "13px" }}>Awaiting review</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => navigate(`/facility-changes/${r.id}`)}
                        className="btnReviewAction"
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
        {meta.totalPages > 1 && (
          <div className="tablePaginationFooter">
            <span>
              Page {meta.page} of {meta.totalPages} ({meta.total} total requests)
            </span>
            <div className="paginationBtnGroup">
              <button
                type="button"
                disabled={meta.page <= 1}
                onClick={() => updateFilters(undefined, undefined, meta.page - 1)}
                className="paginationBtn"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={meta.page >= meta.totalPages}
                onClick={() => updateFilters(undefined, undefined, meta.page + 1)}
                className="paginationBtn"
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
