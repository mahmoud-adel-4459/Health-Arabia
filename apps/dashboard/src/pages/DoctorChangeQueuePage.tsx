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
    <div className="queuePageWrapper">
      {/* Page Header */}
      <div className="queueHeaderRow">
        <div>
          <h1 className="queuePageTitle">Doctor Profile Change Queue</h1>
          <p className="queuePageSubtitle">
            Review proposed profile updates, qualifications, licenses, experience, and documents submitted by registered doctors.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="queueFiltersBar">
        {/* Status Tabs */}
        <div className="statusTabsWrap">
          <button
            type="button"
            className={`tabButton ${currentStatus === "ALL" ? "tabActive" : ""}`}
            onClick={() => updateFilters("ALL", undefined, 1)}
          >
            All Requests ({counts.ALL || 0})
          </button>
          <button
            type="button"
            className={`tabButton ${currentStatus === "PENDING" ? "tabActive" : ""}`}
            onClick={() => updateFilters("PENDING", undefined, 1)}
          >
            Pending Review ({counts.PENDING || 0})
          </button>
          <button
            type="button"
            className={`tabButton ${currentStatus === "APPROVED" ? "tabActive" : ""}`}
            onClick={() => updateFilters("APPROVED", undefined, 1)}
          >
            Approved ({counts.APPROVED || 0})
          </button>
          <button
            type="button"
            className={`tabButton ${currentStatus === "REJECTED" ? "tabActive" : ""}`}
            onClick={() => updateFilters("REJECTED", undefined, 1)}
          >
            Declined ({counts.REJECTED || 0})
          </button>
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleSearchSubmit} className="searchFormWrap">
          <input
            type="text"
            className="searchInput"
            placeholder="Search by doctor name, email, or mobile..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              type="button"
              className="searchClearBtn"
              onClick={() => {
                setSearchInput("");
                updateFilters(undefined, "", 1);
              }}
            >
              ✕
            </button>
          )}
          <button type="submit" className="searchSubmitBtn">
            Search
          </button>
        </form>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="tableLoadingWrap">
          <div className="tableSpinner" />
          <p>Loading doctor profile change requests...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="emptyQueueCard">
          <div className="emptyQueueIcon">📄</div>
          <h3>No Doctor Profile Change Requests Found</h3>
          <p>
            {currentSearch || currentStatus !== "ALL"
              ? "No change requests match the current filters. Try resetting search or selecting another status."
              : "There are currently no doctor profile change requests awaiting platform review."}
          </p>
          {(currentSearch || currentStatus !== "ALL") && (
            <button
              type="button"
              className="btnResetFilters"
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
        <div className="tableCard">
          <table className="adminTable">
            <thead>
              <tr>
                <th>Doctor Candidate</th>
                <th>Specialty &amp; Position</th>
                <th>Contact Identifier</th>
                <th>Changed Fields</th>
                <th>Submission Date</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="accountCell">
                      <span className="accountCellName">{r.doctorName}</span>
                    </div>
                  </td>
                  <td>
                    <span className="textSecondary">{r.jobTitle}</span>
                  </td>
                  <td>
                    <div className="contactCell">
                      {r.email && <span className="contactEmail">{r.email}</span>}
                      {r.mobileE164 && <span className="contactPhone">{r.mobileE164}</span>}
                    </div>
                  </td>
                  <td>
                    <span className="badgeFieldCount">
                      {r.changedFieldCount} {r.changedFieldCount === 1 ? "field" : "fields"}
                    </span>
                  </td>
                  <td>
                    <span className="textSecondary">
                      {new Date(r.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </td>
                  <td>
                    <span className={`statusBadge ${getStatusBadgeClass(r.status)}`}>
                      {r.status === "PENDING"
                        ? "Pending Review"
                        : r.status === "APPROVED"
                        ? "Approved"
                        : r.status === "REJECTED"
                        ? "Declined"
                        : r.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      className="btnInspectAccount"
                      onClick={() => navigate(`/doctor-changes/${r.id}`)}
                    >
                      Review Diff →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="paginationRow">
              <span className="paginationInfo">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} requests
              </span>
              <div className="paginationButtons">
                <button
                  type="button"
                  className="btnPagination"
                  disabled={pagination.page <= 1}
                  onClick={() => updateFilters(undefined, undefined, pagination.page - 1)}
                >
                  Previous
                </button>
                <span className="pageIndicator">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  className="btnPagination"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => updateFilters(undefined, undefined, pagination.page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
