import { useState, type FormEvent } from "react";
import type { AdminUser } from "../types";
import { loginAdmin } from "../api";

interface AdminLoginFormProps {
  onLoginSuccess: (user: AdminUser) => void;
}

export function AdminLoginForm({ onLoginSuccess }: AdminLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Please provide your administrator email address.");
      return;
    }

    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setError("Please enter a valid email address format.");
      return;
    }

    if (!password) {
      setError("Please enter your administrator account password.");
      return;
    }

    setLoading(true);

    try {
      const user = await loginAdmin(cleanEmail, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(
        err.message ||
          "Authentication failed. Please verify your administrator credentials and privileges."
      );
      setLoading(false);
    }
  };

  return (
    <div className="loginPageContainer">
      <div className="loginBackgroundGlow" />

      <div className="loginCardWrapper">
        <div className="loginCard">
          {/* Logo & Header */}
          <div className="loginHeader">
            <div className="loginLogoRow">
              <img
                src="/brand/health-arabia-logo.png"
                alt="Health Arabia Logo"
                className="loginBrandLogo"
              />
              <span className="adminConsolePill">Platform Admin</span>
            </div>
            <h1 className="loginTitle">Management Console</h1>
            <p className="loginSubtitle">
              Secure administrative access for reviewing and approving healthcare professional and
              institutional credentials.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="loginAlertError" role="alert">
              <div className="loginAlertContent">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
              <button
                type="button"
                className="alertCloseBtn"
                onClick={() => setError(null)}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="loginForm" noValidate>
            <div className="loginField">
              <label htmlFor="login-email" className="loginLabel">
                Administrator Email
              </label>
              <div className="inputWithIcon">
                <svg
                  className="inputIcon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <input
                  id="login-email"
                  type="email"
                  className="loginInput"
                  placeholder="admin@healtharabia.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="loginField">
              <label htmlFor="login-password" className="loginLabel">
                Password
              </label>
              <div className="inputWithIcon">
                <svg
                  className="inputIcon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="loginInput"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="togglePasswordBtn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="loginSubmitBtn" disabled={loading}>
              {loading ? (
                <span className="submitSpinnerRow">
                  <span className="buttonSpinner" />
                  <span>Verifying Credentials...</span>
                </span>
              ) : (
                <span className="submitTextRow">
                  <span>Sign In to Console</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              )}
            </button>
          </form>

          {/* Security note */}
          <div className="loginSecurityNotice">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#059669"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Strictly authorized administrators only. Session activity is audited.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
