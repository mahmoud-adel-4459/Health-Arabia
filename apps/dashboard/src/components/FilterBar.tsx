interface FilterBarProps {
  role: string;
  status: string;
  search: string;
  loading: boolean;
  onRoleChange: (role: "ALL" | "DOCTOR" | "FACILITY") => void;
  onStatusChange: (status: "ALL" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED" | "DRAFT") => void;
  onSearchChange: (search: string) => void;
  onRefresh: () => void;
}

export function FilterBar({
  role,
  status,
  search,
  loading,
  onRoleChange,
  onStatusChange,
  onSearchChange,
  onRefresh,
}: FilterBarProps) {
  return (
    <div className="filterSection">
      {/* Search Bar */}
      <div className="searchBox">
        <svg className="searchIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className="searchInput"
          placeholder="Search by name, email, officer, or phone..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Role Selector */}
      <select
        className="filterSelect"
        value={role}
        onChange={(e) => onRoleChange(e.target.value as any)}
        aria-label="Filter by account role"
      >
        <option value="ALL">All Roles</option>
        <option value="DOCTOR">Healthcare Professionals (Doctors)</option>
        <option value="FACILITY">Hospitals &amp; Clinics</option>
      </select>

      {/* Status Selector */}
      <select
        className="filterSelect"
        value={status}
        onChange={(e) => onStatusChange(e.target.value as any)}
        aria-label="Filter by account status"
      >
        <option value="PENDING_REVIEW">Pending Review</option>
        <option value="APPROVED">Approved</option>
        <option value="REJECTED">Rejected</option>
        <option value="SUSPENDED">Suspended</option>
        <option value="DRAFT">Draft</option>
        <option value="ALL">All Statuses</option>
      </select>

      {/* Refresh */}
      <button
        type="button"
        className="refreshBtn"
        onClick={onRefresh}
        disabled={loading}
        title="Refresh accounts list"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: loading ? "rotate(180deg)" : "none", transition: "transform 0.4s ease" }}>
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
        <span>{loading ? "Refreshing..." : "Refresh"}</span>
      </button>
    </div>
  );
}
