import { useState, useEffect, useCallback, useMemo } from "react";
import type { ReviewQueueAccount, ReviewQueueMeta } from "../types";
import { getReviewAccounts } from "../api";
import { KpiStatsBar } from "../components/KpiStatsBar";
import { FilterBar } from "../components/FilterBar";
import { ReviewQueueTable } from "../components/ReviewQueueTable";
import { useRouter } from "../router";

const DEFAULT_META: ReviewQueueMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
  counts: {
    pending: 0,
    approved: 0,
    rejected: 0,
    doctorsPending: 0,
    facilitiesPending: 0,
  },
};

export function ReviewQueuePage() {
  const { search: currentSearchQuery, navigate } = useRouter();

  // Parse query params from URL
  const queryParams = useMemo(() => new URLSearchParams(currentSearchQuery), [currentSearchQuery]);

  const initialRole = (queryParams.get("role") as any) || "ALL";
  const initialStatus = (queryParams.get("status") as any) || "PENDING_REVIEW";
  const initialSearch = queryParams.get("q") || "";
  const initialPage = parseInt(queryParams.get("page") || "1", 10) || 1;

  const [role, setRole] = useState<"ALL" | "DOCTOR" | "FACILITY">(initialRole);
  const [status, setStatus] = useState<"ALL" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED" | "DRAFT">(initialStatus);
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(initialPage);

  // Sync state when URL search query changes (e.g. from sidebar clicks or browser back/forward)
  useEffect(() => {
    const qParams = new URLSearchParams(currentSearchQuery);
    const urlRole = (qParams.get("role") as any) || "ALL";
    const urlStatus = (qParams.get("status") as any) || "PENDING_REVIEW";
    const urlSearch = qParams.get("q") || "";
    const urlPage = parseInt(qParams.get("page") || "1", 10) || 1;

    setRole(urlRole);
    setStatus(urlStatus);
    setSearch(urlSearch);
    setPage(urlPage);
  }, [currentSearchQuery]);

  // Queue state
  const [accounts, setAccounts] = useState<ReviewQueueAccount[]>([]);
  const [meta, setMeta] = useState<ReviewQueueMeta>(DEFAULT_META);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update URL helper
  const updateUrl = (newRole: string, newStatus: string, newSearch: string, newPage: number) => {
    const params = new URLSearchParams();
    if (newRole !== "ALL") params.set("role", newRole);
    if (newStatus !== "PENDING_REVIEW") params.set("status", newStatus);
    if (newSearch.trim()) params.set("q", newSearch.trim());
    if (newPage > 1) params.set("page", String(newPage));

    const qs = params.toString();
    navigate(qs ? `/accounts?${qs}` : "/accounts");
  };

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await getReviewAccounts({
        role,
        status,
        search: search.trim() || undefined,
        page,
        limit: 10,
      });

      setAccounts(res.data);
      setMeta(res.meta);
    } catch (err: any) {
      setError(err.message || "Failed to load account review queue");
    } finally {
      setLoading(false);
    }
  }, [role, status, search, page]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleFilterSelect = (newRole: "ALL" | "DOCTOR" | "FACILITY", newStatus: any) => {
    setRole(newRole);
    setStatus(newStatus);
    setPage(1);
    updateUrl(newRole, newStatus, search, 1);
  };

  const handleRoleChange = (newRole: "ALL" | "DOCTOR" | "FACILITY") => {
    setRole(newRole);
    setPage(1);
    updateUrl(newRole, status, search, 1);
  };

  const handleStatusChange = (newStatus: any) => {
    setStatus(newStatus);
    setPage(1);
    updateUrl(role, newStatus, search, 1);
  };

  const handleSearchChange = (txt: string) => {
    setSearch(txt);
    setPage(1);
    updateUrl(role, status, txt, 1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrl(role, status, search, newPage);
  };

  const handleResetFilters = () => {
    setRole("ALL");
    setStatus("PENDING_REVIEW");
    setSearch("");
    setPage(1);
    navigate("/accounts");
  };

  return (
    <div className="queuePageWrapper">
      {/* Page Header */}
      <div className="queueHeaderRow">
        <div>
          <h1 className="queueTitle">Account Review Queue</h1>
          <p className="queueSubtitle">
            Evaluate submitted registrations, review professional credentials and institutional inquiry notes,
            and decide approvals.
          </p>
        </div>

        <div className="queueHeaderStatsPill">
          <span className="liveBadgeDot" />
          <span>{meta.counts.pending} Awaiting Review</span>
        </div>
      </div>

      {/* Error state banner */}
      {error && (
        <div className="alertBox" role="alert" style={{ marginBottom: "20px" }}>
          <div className="alertContentWithRetry">
            <span>{error}</span>
            <button type="button" className="retryButton" onClick={fetchQueue}>
              Retry Load
            </button>
          </div>
        </div>
      )}

      {/* KPI Stats Bar */}
      <KpiStatsBar
        counts={meta.counts}
        activeRole={role}
        activeStatus={status}
        onSelectFilter={handleFilterSelect}
      />

      {/* Filter and Search Bar */}
      <FilterBar
        role={role}
        status={status}
        search={search}
        loading={loading}
        onRoleChange={handleRoleChange}
        onStatusChange={handleStatusChange}
        onSearchChange={handleSearchChange}
        onRefresh={fetchQueue}
      />

      {/* Accounts Table */}
      <ReviewQueueTable
        accounts={accounts}
        meta={meta}
        loading={loading}
        onPageChange={handlePageChange}
        onSelectAccount={(acc) => navigate(`/accounts/${acc.id}`)}
        onResetFilters={handleResetFilters}
      />
    </div>
  );
}
