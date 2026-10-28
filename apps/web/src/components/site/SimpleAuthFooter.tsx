import Link from "next/link";
import styles from "./site.module.css";

export function SimpleAuthFooter() {
  return (
    <footer style={{ background: "var(--blue-500)", color: "var(--white)", height: "60px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className={styles.copyright} style={{ margin: 0, height: "60px" }}>
        <span>Copyright © 2026</span>
        <strong className={styles.copyrightCompany}>QEEMATECH</strong>
        <span>| All Rights Reserved</span>
      </div>
    </footer>
  );
}
