import type { AdminUser } from "../types";

interface AdminHeaderProps {
  user: AdminUser;
  onLogout: () => void;
}

export function AdminHeader({ user, onLogout }: AdminHeaderProps) {
  return (
    <header className="dashboardHeader">
      <div className="headerContainer">
        <div className="brandGroup">
          <span className="brandTitle">Health Arabia</span>
          <span className="adminBadge">Platform Admin</span>
        </div>

        <div className="userMenu">
          <div className="userInfo">
            <span className="userName">{user.displayName || "Administrator"}</span>
            <span className="userEmail">{user.email}</span>
          </div>

          <button type="button" onClick={onLogout} className="signOutBtn" title="Sign out of admin session">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
