"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeSlash, InfoCircle } from "iconsax-react";
import styles from "./pages.module.css";

function sanitizeReturnTo(url: string | null): string | null {
  if (!url) return null;
  // Ensure safe relative path (prevent open redirect to external protocols)
  if (url.startsWith("/") && !url.startsWith("//")) {
    return url;
  }
  return null;
}

export function DoctorLoginForm() {
  const searchParams = useSearchParams();
  const rawReturnTo = searchParams.get("returnTo") || searchParams.get("next");
  const returnTo = sanitizeReturnTo(rawReturnTo);
  const statusParam = searchParams.get("status");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    displayName: string;
    isPendingReview: boolean;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError("Please enter your email address or mobile number.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login/doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to sign in. Please verify your credentials.");
        return;
      }

      setSuccessInfo({
        displayName: data.user.displayName || "Doctor",
        isPendingReview: Boolean(data.user.isPendingReview),
      });

      // Navigate to intended target URL (e.g. returnTo job application) or dashboard
      const targetDestination = returnTo || "/dashboard/doctor";
      setTimeout(() => {
        window.location.href = targetDestination;
      }, 1000);
    } catch {
      setError("A connection error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authCard}>
      <h1 className={styles.authTitle}>Welcome Back</h1>
      <p className={styles.authSubtitle}>Sign in to your healthcare career portal.</p>

      {statusParam === "pending_review" && !successInfo && (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "16px",
            fontSize: "13px",
            color: "#1e40af",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <InfoCircle size={18} color="#2563eb" variant="Bold" />
          <span>
            Your profile registration is under review. Sign in to track status and review your profile.
          </span>
        </div>
      )}

      {returnTo && !successInfo && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "16px",
            fontSize: "13px",
            color: "#166534",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <InfoCircle size={18} color="#16a34a" variant="Bold" />
          <span>Sign in with your doctor account to proceed with your job application.</span>
        </div>
      )}

      {error && <div className={styles.authErrorBanner}>{error}</div>}

      {successInfo && (
        <div className={styles.authSuccessBanner}>
          Welcome, {successInfo.displayName}!{" "}
          {successInfo.isPendingReview
            ? "Your account is currently under review by our medical board."
            : "Sign in successful. Redirecting..."}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.authForm}>
        <div className={styles.authField}>
          <label htmlFor="doctor-identifier" className={styles.authLabel}>
            Email Address or Mobile Number
          </label>
          <input
            id="doctor-identifier"
            type="text"
            className={styles.authInput}
            placeholder="doctor.sarah@healtharabia.com or +966..."
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            disabled={loading}
            autoComplete="username"
            required
          />
        </div>

        <div className={styles.authField}>
          <div className={styles.authLabelRow}>
            <label htmlFor="doctor-password" className={styles.authLabel}>
              Password
            </label>
            <span className={styles.authForgotLink} title="Contact support to reset password">
              Forgot Password?
            </span>
          </div>
          <div className={styles.authPasswordWrap}>
            <input
              id="doctor-password"
              type={showPassword ? "text" : "password"}
              className={styles.authInput}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className={styles.authPasswordToggle}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeSlash size={20} color="currentColor" variant="Outline" />
              ) : (
                <Eye size={20} color="currentColor" variant="Outline" />
              )}
            </button>
          </div>
        </div>

        <button type="submit" className={styles.authSubmitBtn} disabled={loading}>
          {loading ? "Signing In..." : "Sign In"}
        </button>
      </form>

      <p className={styles.authFooterText}>
        Don't have an account?
        <Link href="/register/doctor" className={styles.authFooterLink}>
          Create Account
        </Link>
      </p>
    </div>
  );
}
