import styles from "./site.module.css";

export const QEEMATECH_URL = "https://www.qeematech.net/";

export type CopyrightContent = { prefix: string; company: string; suffix: string };

const QeemaTechLink = ({ children }: { children: string }) => (
  <a className={`${styles.copyrightCompany} ${styles.copyrightLink}`} href={QEEMATECH_URL} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
);

// The one copyright line used by every public footer. The QeemaTech attribution link is always present,
// whatever company name is saved in Site settings: when the saved name is QeemaTech it is the link itself,
// otherwise the saved name is shown as written and a fixed QeemaTech link follows it.
export function Copyright({ prefix, company, suffix }: CopyrightContent) {
  const isQeemaTech = /qeematech/i.test(company);
  return (
    <>
      <span>{prefix}</span>
      {isQeemaTech ? <QeemaTechLink>{company}</QeemaTechLink> : <strong className={styles.copyrightCompany}>{company}</strong>}
      <span>| {suffix}</span>
      {!isQeemaTech && <QeemaTechLink>QEEMATECH</QeemaTechLink>}
    </>
  );
}
