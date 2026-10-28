import type { ReviewQueueAccount, ReviewQueueMeta } from "../types";

interface ReviewQueueTableProps {
  accounts: ReviewQueueAccount[];
  meta: ReviewQueueMeta;
  loading: boolean;
  onPageChange: (newPage: number) => void;
  onSelectAccount: (account: ReviewQueueAccount) => void;
  onResetFilters?: () => void;
}

export function ReviewQueueTable({
  accounts,
  meta,
  loading,
  onPageChange,
  onSelectAccount,
  onResetFilters,
}: ReviewQueueTableProps) {
  function formatDate(val: string | null) {
    if (!val) return "—";
    try {
      const d = new Date(val);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return val;
    }
  }

  function renderStatusBadge(status: string) {
    switch (status) {
      case "PENDING_REVIEW":
        return <span className="statusPill statusPill-pending">Pending Review</span>;
      case "APPROVED":
        return <span className="statusPill statusPill-approved">Approved</span>;
      case "REJECTED":
        return <span className="statusPill statusPill-rejected">Declined</span>;
      case "SUSPENDED":
        return <span className="statusPill statusPill-suspended">Suspended</span>;
      case "DRAFT":
        return <span className="statusPill statusPill-draft">Draft</span>;
      default:
        return <span className="statusPill">{status}</span>;
    }
  }

  return (
    <div className="tableContainer">
      {loading ? (
        <div className="tableSkeletonWrapper">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="tableSkeletonRow">
              <div className="skeletonBox avatarSkeleton" />
              <div className="skeletonBox textSkeleton" style={{ width: "25%" }} />
              <div className="skeletonBox badgeSkeleton" style={{ width: "12%" }} />
              <div className="skeletonBox textSkeleton" style={{ width: "20%" }} />
              <div className="skeletonBox badgeSkeleton" style={{ width: "15%" }} />
              <div className="skeletonBox buttonSkeleton" style={{ width: "10%" }} />
            </div>
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="tableEmptyState">
          <div className="emptyStateIconBox">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#64748b"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </div>
          <h3 className="emptyStateTitle">No Accounts Match the Current Filters</h3>
          <p className="emptyStateSubtitle">
            There are no candidate or facility accounts corresponding to your selected role, status, or search query.
          </p>
          {onResetFilters && (
            <button type="button" className="emptyStateResetBtn" onClick={onResetFilters}>
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <table className="desktopTable">
            <thead>
              <tr>
                <th>Candidate / Facility</th>
                <th>Role</th>
                <th>Contact Credentials</th>
                <th>Location</th>
                <th>Submitted Date</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc) => (
                <tr
                  key={acc.id}
                  onClick={() => onSelectAccount(acc)}
                  className="clickableTableRow"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectAccount(acc);
                    }
                  }}
                  role="button"
                  aria-label={`Inspect account for ${acc.applicantName}`}
                >
                  <td>
                    <div className="applicantCell">
                      <div className="applicantAvatar">
                        {acc.applicantName.charAt(0).toUpperCase()}
                      </div>
                      <div className="applicantMeta">
                        <div className="applicantNameText">{acc.applicantName}</div>
                        {acc.role === "DOCTOR" && acc.summary.jobTitle ? (
                          <div className="applicantSubText">
                            {acc.summary.jobTitle}
                            {acc.summary.specialty ? ` • ${acc.summary.specialty}` : ""}
                          </div>
                        ) : null}
                        {acc.role === "FACILITY" && acc.summary.type ? (
                          <div className="applicantSubText">
                            {acc.summary.type} • {acc.summary.officerName || "Contact"}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className={`roleBadge roleBadge-${acc.role.toLowerCase()}`}>
                      {acc.role === "DOCTOR" ? "Doctor" : "Facility"}
                    </span>
                  </td>

                  <td>
                    <div className="contactEmailText">{acc.email || "—"}</div>
                    {acc.mobileE164 && (
                      <div className="contactMobileText">{acc.mobileE164}</div>
                    )}
                  </td>

                  <td>
                    <div className="locationText">{acc.location || "—"}</div>
                  </td>

                  <td>
                    <div className="dateText">
                      {formatDate(acc.submittedForReviewAt || acc.createdAt)}
                    </div>
                  </td>

                  <td>{renderStatusBadge(acc.status)}</td>

                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      className="btnReviewAction"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAccount(acc);
                      }}
                    >
                      <span>Review</span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Card List View */}
          <div className="mobileCardList">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="mobileCard"
                onClick={() => onSelectAccount(acc)}
                role="button"
                tabIndex={0}
              >
                <div className="mobileCardHeader">
                  <div className="mobileApplicantRow">
                    <div className="applicantAvatar">
                      {acc.applicantName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="mobileApplicantName">{acc.applicantName}</div>
                      <div className="mobileApplicantContact">
                        {acc.email || acc.mobileE164}
                      </div>
                    </div>
                  </div>
                  {renderStatusBadge(acc.status)}
                </div>

                <div className="mobileCardMetaRow">
                  <span className={`roleBadge roleBadge-${acc.role.toLowerCase()}`}>
                    {acc.role === "DOCTOR" ? "Doctor" : "Facility"}
                  </span>
                  <span className="mobileLocationText">{acc.location}</span>
                </div>

                <div className="mobileDateText">
                  Submitted: {formatDate(acc.submittedForReviewAt || acc.createdAt)}
                </div>

                <button
                  type="button"
                  className="btnMobileInspect"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAccount(acc);
                  }}
                >
                  <span>Inspect & Review Account</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination Bar */}
      <div className="paginationBar">
        <div className="pageInfo">
          Showing <strong>{accounts.length}</strong> of <strong>{meta.total}</strong> accounts
          {meta.totalPages > 1 && ` (Page ${meta.page} of ${meta.totalPages})`}
        </div>

        <div className="pageButtons">
          <button
            type="button"
            className="pageBtn"
            disabled={meta.page <= 1 || loading}
            onClick={() => onPageChange(meta.page - 1)}
          >
            Previous
          </button>
          <span className="pageIndicator">
            {meta.page} / {Math.max(1, meta.totalPages)}
          </span>
          <button
            type="button"
            className="pageBtn"
            disabled={meta.page >= meta.totalPages || loading}
            onClick={() => onPageChange(meta.page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
