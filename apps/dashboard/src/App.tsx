import { useState, useEffect } from "react";
import type { AdminUser } from "./types";
import { getCurrentAdmin, logoutAdmin, getBadgeCounts } from "./api";
import { RouterProvider, useRouter } from "./router";
import { DeletionRequestsPage, DeletionRequestDetailPage } from "./pages/DeletionRequestPages";
import { CountriesListPage, CountryCreatePage, CountryDetailPage } from "./pages/CountryPages";
import { SettingsPage } from "./pages/SettingsPage";
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
import { ApplicationsQueuePage } from "./pages/ApplicationsQueuePage";
import { ApplicationDetailPage } from "./pages/ApplicationDetailPage";
import { OverviewPage } from "./pages/OverviewPage";
import { DirectoryPage, AuditPage } from "./pages/PlatformPages";
import { ContactDetailPage, ContactSubmissionsPage } from "./pages/ContactPages";
import { HireRequestDetailPage } from "./pages/HireRequestDetailPage";
import { ContentPage } from "./pages/ContentPage";
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
  const [newContactCount, setNewContactCount] = useState<number>(0);
  const [placementsReadyCount, setPlacementsReadyCount] = useState<number>(0);
  const [deletionOpenCount, setDeletionOpenCount] = useState<number>(0);
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
      // Count-only endpoint: no personal data is read and no audit entries are written
      const c = await getBadgeCounts();
      setPendingCount(c.pendingAccounts);
      setPendingChangesCount(c.facilityChanges);
      setPendingDoctorChangesCount(c.doctorChanges);
      setPendingJobsCount(c.jobsPending);
      setPendingHiresCount(c.releasesToDecide);
      setNewContactCount(c.contactNew);
      setPlacementsReadyCount(c.placementsReady);
      setDeletionOpenCount(c.deletionOpen);
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
          navigate("/overview", { replace: true });
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
      newContactCount={newContactCount}
      placementsReadyCount={placementsReadyCount}
      deletionOpenCount={deletionOpenCount}
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
      ) : path === "/countries/new" ? (
        <CountryCreatePage onActionComplete={handleActionComplete} />
      ) : path === "/countries/:id" && params.id ? (
        <CountryDetailPage countryId={params.id} onActionComplete={handleActionComplete} />
      ) : path === "/countries" ? (
        <CountriesListPage />
      ) : path === "/settings" ? (
        <SettingsPage onActionComplete={handleActionComplete} />
      ) : path === "/deletion-requests/:id" && params.id ? (
        <DeletionRequestDetailPage requestId={params.id} onActionComplete={handleActionComplete} />
      ) : path === "/deletion-requests" ? (
        <DeletionRequestsPage />
      ) : path === "/hire-requests/:id" && params.id ? (
        <HireRequestDetailPage requestId={params.id} onActionComplete={handleActionComplete} />
      ) : path === "/hire-requests" ? (
        <HireRequestsQueuePage />
      ) : path === "/applications/:id" && params.id ? (
        <ApplicationDetailPage applicationId={params.id} onActionComplete={handleActionComplete} />
      ) : path === "/applications" ? (
        <ApplicationsQueuePage />
      ) : path === "/overview" ? (
        <OverviewPage />
      ) : path === "/directory" ? (
        <DirectoryPage onActionComplete={handleActionComplete} />
      ) : path === "/reference-data" ? (
        <ContentPage onActionComplete={handleActionComplete} />
      ) : path === "/contact-submissions/:id" && params.id ? (
        <ContactDetailPage submissionId={params.id} onActionComplete={handleActionComplete} />
      ) : path === "/contact-submissions" ? (
        <ContactSubmissionsPage />
      ) : path === "/audit" ? (
        <AuditPage />
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
