"use client";

import { ArrowLeft, ArrowRight } from "iconsax-react";
import { useRef } from "react";
import type { Section, SectionIntro, Testimonial } from "@/lib/home-content";
import { SectionHeader } from "./HomeSections";
import styles from "./home.module.css";

export function Testimonials({
  section,
  testimonials,
}: {
  section: Section<SectionIntro>;
  testimonials: Testimonial[];
}) {
  const trackRef = useRef<HTMLUListElement>(null);

  const scroll = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector("li");
    const step = card ? card.getBoundingClientRect().width + 24 : track.clientWidth;
    track.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  return (
    <section className={styles.testimonials}>
      <div className="container">
        <SectionHeader
          intro={section.data}
          title={section.title}
          aside={
            <div className={styles.carouselControls}>
              <button type="button" className={styles.carouselPrev} onClick={() => scroll(-1)} aria-label="Previous">
                <ArrowLeft size={24} color="currentColor" variant="Outline" />
              </button>
              <button type="button" className={styles.carouselNext} onClick={() => scroll(1)} aria-label="Next">
                <ArrowRight size={24} color="currentColor" variant="Outline" />
              </button>
            </div>
          }
        />
        <ul ref={trackRef} className={styles.testimonialTrack}>
          {testimonials.map((item) => (
            <li key={item.id} className={styles.testimonialCard}>
              <blockquote className={styles.testimonialQuote}>&ldquo;{item.quote}&rdquo;</blockquote>
              <div className={styles.testimonialAuthor}>
                {item.photoUrl ? (
                  <img
                    src={item.photoUrl}
                    alt={item.authorName}
                    className={styles.testimonialAvatar}
                    width={48}
                    height={48}
                  />
                ) : (
                  <span className={styles.testimonialAvatar} aria-hidden="true" />
                )}
                <div>
                  <p className={styles.testimonialName}>{item.authorName}</p>
                  <p className={styles.testimonialRole}>
                    {[item.authorTitle, item.authorLocation].filter(Boolean).join(" — ")}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
