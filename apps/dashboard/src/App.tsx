import { useState, useEffect } from "react";
import type { AdminUser } from "./types";
import { getCurrentAdmin, logoutAdmin, getReviewAccounts, getFacilityChangeRequests, getDoctorChangeRequests, getJobSubmissions, getAdminHireRequests } from "./api";
import { RouterProvider, useRouter } from "./router";
import { AdminShell } from "./components/AdminShell";
import { AdminLoginForm } from "./components/AdminLoginForm";
import { ReviewQueuePage } from "./pages/ReviewQueuePage";
import { AccountDetailPage } from "./pages/AccountDetailPage";
import { FacilityChangeQueuePage } from "./pages/FacilityChangeQueuePage";
import { FacilityChangeDetailPage } from "./pages/FacilityChangeDetailPage";
import { DoctorChangeQueuePage } from "./pages/DoctorChangeQueuePage";
import { DoctorChangeDetailPage } from "./pages/DoctorChangeDetailPage";
import { JobQueuePage } from "./pages/JobQueuePage";
import { JobDetailPage } from "./pages/JobDetailPage";
import { HireRequestsQueuePage } from "./pages/HireRequestsQueuePage";
import "./dashboard.css";

function DashboardContent() {
  const { path, params, navigate } = useRouter();

  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [pendingChangesCount, setPendingChangesCount] = useState<number>(0);
  const [pendingDoctorChangesCount, setPendingDoctorChangesCount] = useState<number>(0);
  const [pendingJobsCount, setPendingJobsCount] = useState<number>(0);
  const [pendingHiresCount, setPendingHiresCount] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Check administrator session on initial load
  useEffect(() => {
    let mounted = true;
    getCurrentAdmin()
      .then((user) => {
        if (mounted) {
          setCurrentUser(user);
          setAuthChecking(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setCurrentUser(null);
          setAuthChecking(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch pending count for sidebar badge
  const refreshPendingCount = async () => {
    try {
      const [accRes, changesRes, doctorChangesRes, jobsRes, hiresRes] = await Promise.all([
        getReviewAccounts({ status: "PENDING_REVIEW", page: 1, limit: 1 }),
        getFacilityChangeRequests({ status: "PENDING", page: 1, limit: 1 }),
        getDoctorChangeRequests({ status: "PENDING", page: 1, limit: 1 }),
        getJobSubmissions({ status: "PENDING_REVIEW", page: 1, limit: 1 }),
        getAdminHireRequests({ page: 1, limit: 1 }),
      ]);
      setPendingCount(accRes.meta.counts.pending);
      setPendingChangesCount(changesRes.meta.counts.PENDING);
      setPendingDoctorChangesCount(doctorChangesRes.counts.PENDING || 0);
      setPendingJobsCount(jobsRes.meta.counts.pendingReview);
      setPendingHiresCount(hiresRes.meta.pendingReleaseCount || 0);
    } catch {
      // non-blocking
    }
  };

  useEffect(() => {
    if (currentUser) {
      refreshPendingCount();
    }
  }, [currentUser, path]);

  // Sign out handler
  const handleLogout = async () => {
    await logoutAdmin();
    setCurrentUser(null);
    navigate("/login", { replace: true });
  };

  // Toast auto-clear
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 5000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const handleActionComplete = (msg: string) => {
    setToastMessage(msg);
    refreshPendingCount();
  };

  if (authChecking) {
    return (
      <div className="authCheckingScreen">
        <div className="authCheckingCard">
          <img
            src="/brand/health-arabia-logo.png"
            alt="Health Arabia"
            className="authCheckingLogo"
          />
          <div className="authCheckingSpinner" />
          <div className="authCheckingText">Authenticating with Platform Console...</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AdminLoginForm
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          navigate("/accounts", { replace: true });
        }}
      />
    );
  }

  return (
    <AdminShell
      user={currentUser}
      pendingCount={pendingCount}
      pendingChangesCount={pendingChangesCount}
      pendingDoctorChangesCount={pendingDoctorChangesCount}
      pendingJobsCount={pendingJobsCount}
      pendingHiresCount={pendingHiresCount}
      onLogout={handleLogout}
    >
      {path === "/accounts/:id" && params.id ? (
        <AccountDetailPage
          accountId={params.id}
          onActionComplete={handleActionComplete}
        />
      ) : path === "/facility-changes/:id" && params.id ? (
        <FacilityChangeDetailPage
          requestId={params.id}
          onActionComplete={handleActionComplete}
        />
      ) : path === "/facility-changes" ? (
        <FacilityChangeQueuePage />
      ) : path === "/doctor-changes/:id" && params.id ? (
        <DoctorChangeDetailPage
          requestId={params.id}
          onActionComplete={handleActionComplete}
        />
      ) : path === "/doctor-changes" ? (
        <DoctorChangeQueuePage />
      ) : path === "/jobs/:id" && params.id ? (
        <JobDetailPage
          jobId={params.id}
          onActionComplete={handleActionComplete}
        />
      ) : path === "/jobs" ? (
        <JobQueuePage />
      ) : path === "/hire-requests" ? (
        <HireRequestsQueuePage onActionComplete={handleActionComplete} />
      ) : (
        <ReviewQueuePage />
      )}

      {/* Floating Success Notification Toast */}
      {toastMessage && (
        <div className="floatingToast" role="status">
          <div className="toastIconBox">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#16a34a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span className="toastText">{toastMessage}</span>
          <button
            type="button"
            className="toastCloseBtn"
            onClick={() => setToastMessage(null)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
    </AdminShell>
  );
}

export function App() {
  return (
    <RouterProvider>
      <DashboardContent />
    </RouterProvider>
  );
}
