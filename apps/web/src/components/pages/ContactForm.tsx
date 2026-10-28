"use client";

import { useState } from "react";
import type { ContactSubjectItem } from "@/lib/public-content";
import styles from "./pages.module.css";

export function ContactForm({ subjects }: { subjects: ContactSubjectItem[] }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Please provide your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please provide a valid email address.");
      return;
    }
    if (!message.trim()) {
      setError("Please enter your message.");
      return;
    }

    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
      const res = await fetch(`${apiUrl}/public/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone: phone || null,
          subjectId: subjectId || null,
          message,
          locale: "EN",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to send message. Please try again.");
      }

      setSuccess(true);
      setFullName("");
      setEmail("");
      setPhone("");
      setSubjectId("");
      setMessage("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.successMessage}>
        <h3>Message Sent Successfully!</h3>
        <p style={{ marginTop: "8px", fontWeight: "normal", fontSize: "15px" }}>
          Thank you for reaching out to Health Arabia. A dedicated recruitment consultant will review your message
          and get back to you shortly.
        </p>
        <button
          type="button"
          onClick={() => setSuccess(false)}
          className={styles.btnPrimary}
          style={{ marginTop: "16px", height: "40px", fontSize: "14px" }}
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.formGrid}>
      {error ? <div className={styles.errorMessage}>{error}</div> : null}

      <div className={styles.formRow}>
        <label className={styles.formField}>
          <span className={styles.fieldLabel}>Full Name</span>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Dr. Sarah Jenkins"
            className={styles.input}
          />
        </label>

        <label className={styles.formField}>
          <span className={styles.fieldLabel}>Email Address</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sarah.j@healtharabia.com"
            className={styles.input}
          />
        </label>
      </div>

      <div className={styles.formRow}>
        <label className={styles.formField}>
          <span className={styles.fieldLabel}>Phone Number</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+44 7622 719082"
            className={styles.input}
          />
        </label>

        <label className={styles.formField}>
          <span className={styles.fieldLabel}>Subject</span>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className={styles.select}
          >
            <option value="">Select a subject...</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={styles.formField}>
        <span className={styles.fieldLabel}>Your Message</span>
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Hello, I am a Consultant Cardiologist looking to explore opportunities in Riyadh..."
          className={styles.textarea}
        />
      </label>

      <button type="submit" disabled={loading} className={styles.submitBtn}>
        {loading ? "Sending Message..." : "Send Message"}
      </button>
    </form>
  );
}
