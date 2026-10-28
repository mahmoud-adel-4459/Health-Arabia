"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import styles from "./pages.module.css";

export function JobsSortControl({ total }: { total: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "recent";

  const onSortChange = useCallback(
    (newSort: string) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      if (newSort === "recent") {
        current.delete("sort");
      } else {
        current.set("sort", newSort);
      }
      router.push(`/jobs?${current.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className={styles.jobsTopBar}>
      <div className={styles.jobsCount}>
        Showing <strong>{total} Available Jobs</strong> in Saudi Arabia & GCC
      </div>
      <div className={styles.jobsSort}>
        <span>Sort by:</span>
        <select
          value={currentSort}
          onChange={(e) => onSortChange(e.target.value)}
          aria-label="Sort jobs"
        >
          <option value="recent">Most Recent</option>
          <option value="experience">Experience Level</option>
        </select>
      </div>
    </div>
  );
}
