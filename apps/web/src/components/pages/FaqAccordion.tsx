"use client";

import { useState } from "react";
import type { FaqItem } from "@/lib/public-content";
import styles from "./pages.module.css";

export function FaqAccordion({ faqs }: { faqs: FaqItem[] }) {
  // First item open by default as in Figma frame 351:1197
  const [openIds, setOpenIds] = useState<Record<string, boolean>>(() => {
    if (faqs.length > 0) {
      return { [faqs[0].id]: true };
    }
    return {};
  });

  const toggle = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (faqs.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h3 className={styles.emptyStateTitle}>No Frequently Asked Questions</h3>
        <p className={styles.emptyStateText}>
          Frequently asked questions are being compiled. If you have questions, please reach out via our Contact page.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.faqList}>
      {faqs.map((faq) => {
        const isOpen = !!openIds[faq.id];
        return (
          <div key={faq.id} className={styles.faqItem}>
            <button
              type="button"
              className={styles.faqTrigger}
              onClick={() => toggle(faq.id)}
              aria-expanded={isOpen}
            >
              <span className={styles.faqQuestion}>{faq.question}</span>
              <span className={styles.faqIcon} aria-hidden="true">
                {isOpen ? "−" : "+"}
              </span>
            </button>
            {isOpen ? (
              <div className={styles.faqAnswerWrap}>
                <p className={styles.faqAnswer}>{faq.answer}</p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
