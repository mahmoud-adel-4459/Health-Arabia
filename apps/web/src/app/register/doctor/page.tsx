import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SimpleAuthFooter } from "@/components/site/SimpleAuthFooter";
import { getAboutContent } from "@/lib/public-content";
import { DoctorRegistrationWizard } from "@/components/pages/DoctorRegistrationWizard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Doctor Registration | HealthArabia",
  description:
    "Join Health Arabia as a healthcare professional. Complete your registration wizard to connect with leading healthcare facilities across Saudi Arabia and the GCC.",
};

export default async function DoctorRegisterPage() {
  const content = await getAboutContent();

  return (
    <>
      {content.header ? <SiteHeader content={content.header} activeHref="/register/doctor" /> : null}

      <DoctorRegistrationWizard />

      <SimpleAuthFooter />
    </>
  );
}
