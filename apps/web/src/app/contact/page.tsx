import { Call, Clock, Location } from "iconsax-react";
import type { Metadata } from "next";
import { ContactForm } from "@/components/pages/ContactForm";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getContactContent } from "@/lib/public-content";
import styles from "@/components/pages/pages.module.css";

export const metadata: Metadata = {
  title: "Contact Our Consultants | Health Arabia",
  description:
    "Get in touch with Health Arabia's medical recruitment specialists in London and Riyadh for confidential clinical career and staffing inquiries.",
};

export default async function ContactPage() {
  const content = await getContactContent();
  const hero = content.sections.hero;
  const directContacts = content.sections["direct-contacts"]?.data;
  const subjects = content.subjects;

  return (
    <>
      {content.header ? <SiteHeader content={content.header} activeHref="/contact" /> : null}

      <main>
        {/* Page Hero */}
        <section className={styles.pageHero}>
          {hero?.data?.bgImage ? (
            <>
              <img src={hero.data.bgImage} alt="" className={styles.pageHeroBgImg} aria-hidden="true" />
              <div className={styles.pageHeroOverlay} aria-hidden="true" />
            </>
          ) : null}
          <div className={`container ${styles.pageHeroContent}`}>
            <h1 className={styles.pageHeroTitle}>{hero?.title ?? "Contact Us"}</h1>
            <p className={styles.pageHeroBody}>
              {hero?.body ??
                "HealthArabia partners directly with premium government, military, and private entities across Saudi Arabia and the GCC region to source high-caliber candidates."}
            </p>
          </div>
        </section>

        {/* Contact Form and Direct Contacts Section */}
        <section className={styles.contactSection}>
          <div className={`container ${styles.contactGrid}`}>
            {/* Left: Send Us a Message Form Card */}
            <div className={styles.contactFormCard}>
              <h2 className={styles.formTitle}>Send Us a Message</h2>
              <ContactForm subjects={subjects} />
            </div>

            {/* Right: Direct Contacts & Map */}
            <div className={styles.directContactsCol}>
              <div className={styles.directContactsCard}>
                <h2 className={styles.formTitle}>Direct Contacts</h2>
                <div className={styles.directContactsList}>
                  <div className={styles.directContactItem}>
                    <div className={styles.contactIconCircle}>
                      <Call size={20} color="currentColor" variant="Bold" />
                    </div>
                    <div>
                      <span className={styles.contactItemLabel}>Phone Number</span>
                      <p className={styles.contactItemVal}>
                        <a href={`tel:${directContacts?.phone ?? "+447622719082"}`}>
                          {directContacts?.phone ?? "+44 7622 719082"}
                        </a>
                      </p>
                    </div>
                  </div>

                  <div className={styles.directContactItem}>
                    <div className={styles.contactIconCircle}>
                      <Clock size={20} color="currentColor" variant="Bold" />
                    </div>
                    <div>
                      <span className={styles.contactItemLabel}>Office Hours</span>
                      <p className={styles.contactItemVal}>{directContacts?.hours ?? "Mon–Fri, 9AM–6PM GMT"}</p>
                    </div>
                  </div>

                  <div className={styles.directContactItem}>
                    <div className={styles.contactIconCircle}>
                      <Location size={20} color="currentColor" variant="Bold" />
                    </div>
                    <div>
                      <span className={styles.contactItemLabel}>Primary Location</span>
                      <p className={styles.contactItemVal}>
                        {directContacts?.location ?? "London, United Kingdom"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map Illustration Card */}
              <div className={styles.mapCard}>
                <img
                  src="/images/common/map-illustration.png"
                  alt="Health Arabia Office Location Map"
                  className={styles.mapIllustration}
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      {content.footer ? <SiteFooter content={content.footer} /> : null}
    </>
  );
}
