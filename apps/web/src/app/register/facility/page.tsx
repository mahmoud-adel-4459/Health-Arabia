import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SimpleAuthFooter } from "@/components/site/SimpleAuthFooter";
import { getAboutContent, getManagedCities } from "@/lib/public-content";
import { FacilityRegistrationWizard } from "@/components/pages/FacilityRegistrationWizard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hospital & Clinic Registration | HealthArabia",
  description:
    "Join Health Arabia as an institutional healthcare provider. Complete your facility onboarding wizard to recruit top clinical consultants and specialists across Saudi Arabia and the GCC.",
};

export default async function FacilityRegisterPage() {
  const [content, cities] = await Promise.all([
    getAboutContent(),
    getManagedCities(),
  ]);

  return (
    <>
      {content.header ? <SiteHeader content={content.header} activeHref="/register/facility" /> : null}

      <FacilityRegistrationWizard initialCities={cities} />

      <SimpleAuthFooter />
    </>
  );
}
