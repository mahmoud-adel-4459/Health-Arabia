import { Copyright } from "./Copyright";
import styles from "./site.module.css";

export function SimpleAuthFooter() {
  return (
    <footer style={{ background: "var(--blue-500)", color: "var(--white)", minHeight: "60px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className={styles.copyright} style={{ margin: 0 }}>
        <Copyright prefix="Copyright © 2026" company="QEEMATECH" suffix="All Rights Reserved" />
      </div>
    </footer>
  );
}
