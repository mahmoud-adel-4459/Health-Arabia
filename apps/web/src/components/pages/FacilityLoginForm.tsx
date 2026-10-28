"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeSlash } from "iconsax-react";
import styles from "./pages.module.css";

export function FacilityLoginForm() {
  const [email, setEmail] = useState("");
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

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter your institutional email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login/facility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to log in. Please verify your credentials.");
        return;
      }

      setSuccessInfo({
        displayName: data.user.displayName || "Facility Representative",
        isPendingReview: Boolean(data.user.isPendingReview),
      });

      setTimeout(() => {
        if (data.user.isPendingReview) {
          window.location.href = "/login/facility?status=pending_review";
        } else {
          window.location.href = "/dashboard/facility";
        }
      }, 1000);
    } catch {
      setError("A connection error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authCard}>
      <h1 className={styles.authTitle}>Hospital Portal</h1>
      <p className={styles.authSubtitle}>Access your secure institution dashboard.</p>

      {error && <div className={styles.authErrorBanner}>{error}</div>}

      {successInfo && (
        <div className={styles.authSuccessBanner}>
          Welcome, {successInfo.displayName}!{" "}
          {successInfo.isPendingReview
            ? "Your facility verification is currently pending review by platform administrators."
            : "Sign in successful. Redirecting..."}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.authForm}>
        <div className={styles.authField}>
          <label htmlFor="facility-email" className={styles.authLabel}>
            Institutional Email Address
          </label>
          <input
            id="facility-email"
            type="email"
            className={styles.authInput}
            placeholder="officer.zayed@healtharabia.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoComplete="username"
            required
          />
        </div>

        <div className={styles.authField}>
          <div className={styles.authLabelRow}>
            <label htmlFor="facility-password" className={styles.authLabel}>
              Password
            </label>
            <span className={styles.authForgotLink} title="Contact support to reset password">
              Forgot Password?
            </span>
          </div>
          <div className={styles.authPasswordWrap}>
            <input
              id="facility-password"
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

        <button
          type="submit"
          className={`${styles.authSubmitBtn} ${styles.authSubmitBtn_dark}`}
          disabled={loading}
        >
          {loading ? "Logging In..." : "Log In to Portal"}
        </button>
      </form>

      <p className={styles.authFooterText}>
        Don't have an account?
        <Link href="/register/facility" className={styles.authFooterLink}>
          Create Account
        </Link>
      </p>
    </div>
  );
}
