import { useEffect, useState } from "react";
import type { SeoSettings, SeoValues, SiteGeneral } from "../types";
import { getSeoSettings, getSiteGeneral, saveSeoSettings, saveSiteGeneral } from "../api";
import { useRouter } from "../router";
import { ContentProvider, Field, SaveBar, Toggle, WEB_URL, useContentCtx, useEditor } from "../components/contentUi";

const Loading = ({ text }: { text: string }) => (
  <div className="tableLoadingState"><div className="tableSpinner" /><p>{text}</p></div>
);

// Which server field each form field reports errors under
const SERVER_FIELD: Record<string, string> = {
  facebook: "social.facebook", linkedin: "social.linkedin", x: "social.x",
  address: "contact.address", email: "contact.email", phone: "contact.phone", hours: "contact.hours",
};

type GeneralDraft = Record<"brandName" | "logoUrl" | "faviconUrl" | "tagline" | "copyrightCompany" | "facebook" | "linkedin" | "x" | "address" | "email" | "phone" | "hours", string>;

const toDraft = (g: SiteGeneral): GeneralDraft => ({
  brandName: g.brandName, logoUrl: g.logoUrl, faviconUrl: g.faviconUrl, tagline: g.tagline, copyrightCompany: g.copyrightCompany,
  facebook: g.social.facebook, linkedin: g.social.linkedin, x: g.social.x,
  address: g.contact.address, email: g.contact.email, phone: g.contact.phone, hours: g.contact.hours,
});

const previewSrc = (url: string) => (url.startsWith("/") ? `${WEB_URL}${url}` : url);

function GeneralForm({ initial }: { initial: SiteGeneral }) {
  const ed = useEditor<GeneralDraft>({
    id: "settings-general",
    initial: toDraft(initial),
    successMessage: "Site settings saved. The website shows them now.",
    validate: (d) => (d.brandName.trim() ? null : { field: "brandName", message: "Brand name is required." }),
    save: (d) =>
      saveSiteGeneral({
        brandName: d.brandName, logoUrl: d.logoUrl, faviconUrl: d.faviconUrl, tagline: d.tagline, copyrightCompany: d.copyrightCompany,
        social: { facebook: d.facebook, linkedin: d.linkedin, x: d.x },
        contact: { address: d.address, email: d.email, phone: d.phone, hours: d.hours },
      }),
  });
  const d = ed.draft;
  const err = (n: string) => (ed.error?.field === (SERVER_FIELD[n] ?? n) ? ed.error.message : null);
  const set = (k: keyof GeneralDraft) => (e: { target: { value: string } }) => ed.setDraft({ ...d, [k]: e.target.value });
  const input = (k: keyof GeneralDraft, props: Record<string, unknown> = {}) => <input className="cmsInput" value={d[k]} onChange={set(k)} {...props} />;

  return (
    <div className="contentCard">
      <div className="cmsForm">
        <section className="cmsGroup">
          <h4 className="cmsGroupTitle">Brand</h4>
          <Field label="Brand name *" help="Used in the website’s logo description and browser tab." error={err("brandName")}>{input("brandName")}</Field>
          <div className="cmsFields cmsRow">
            <Field label="Logo" help="Address of the logo picture: a full https:// address, or a path on the website such as /brand/health-arabia-logo.png. Uploading pictures here is not available yet: it needs the file storage service that has not been chosen." error={err("logoUrl")}>{input("logoUrl")}</Field>
            <Field label="Favicon (browser tab icon)" help="Optional. Same kind of address as the logo. Leave empty to keep the browser’s default icon." error={err("faviconUrl")}>{input("faviconUrl")}</Field>
          </div>
          {d.logoUrl && (
            <div className="cmsFieldHelp" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span>Logo preview:</span>
              <img src={previewSrc(d.logoUrl)} alt="" style={{ maxHeight: 40, maxWidth: 220, background: "#f1f5f9", padding: 6, borderRadius: 8 }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            </div>
          )}
        </section>

        <section className="cmsGroup">
          <h4 className="cmsGroupTitle">Contact details shown in the website footer</h4>
          <Field label="Address" error={err("address")}>{input("address")}</Field>
          <div className="cmsFields cmsRow">
            <Field label="Email address" error={err("email")}>{input("email", { type: "email" })}</Field>
            <Field label="Phone number" help="Digits, spaces, + ( ) - and . only." error={err("phone")}>{input("phone")}</Field>
          </div>
          <Field label="Opening hours" error={err("hours")}>{input("hours")}</Field>
          <p className="cmsFieldHelp">Leave a field empty to hide it from the footer.</p>
        </section>

        <section className="cmsGroup">
          <h4 className="cmsGroupTitle">Social media links</h4>
          <p className="cmsFieldHelp">Full https:// addresses. Only the links you fill in appear in the footer.</p>
          <div className="cmsFields cmsRow">
            <Field label="Facebook" error={err("facebook")}>{input("facebook", { placeholder: "https://" })}</Field>
            <Field label="LinkedIn" error={err("linkedin")}>{input("linkedin", { placeholder: "https://" })}</Field>
            <Field label="X (Twitter)" error={err("x")}>{input("x", { placeholder: "https://" })}</Field>
          </div>
        </section>

        <section className="cmsGroup">
          <h4 className="cmsGroupTitle">Footer text</h4>
          <Field label="Footer description" help="The short paragraph under the logo in the footer." error={err("tagline")}>
            <textarea className="cmsInput cmsTextarea" rows={3} value={d.tagline} onChange={set("tagline")} />
          </Field>
          <Field label="Copyright holder" help="Shown after “Copyright © 2026”." error={err("copyrightCompany")}>{input("copyrightCompany")}</Field>
        </section>

        <SaveBar dirty={ed.dirty} saving={ed.saving} error={ed.error} onSave={ed.submit} onDiscard={ed.discard} saveLabel="Save settings"
          fieldNames={["brandName", "logoUrl", "faviconUrl", "tagline", "copyrightCompany", ...Object.values(SERVER_FIELD)]} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SEO
// ---------------------------------------------------------------------------
const SEO_SCOPES: Array<[string, string]> = [["DEFAULT", "Site defaults"], ["HOME", "Home"], ["ABOUT", "About us"], ["COUNTRIES", "Countries"], ["HOSPITALS", "Hospitals"], ["FAQ", "FAQs"], ["CONTACT", "Contact us"], ["JOBS", "Jobs"]];

type SeoDraft = { title: string; description: string; ogTitle: string; ogDescription: string; ogImage: string; canonicalUrl: string; noindex: boolean };
const toSeoDraft = (v: SeoValues | undefined): SeoDraft => ({
  title: v?.title ?? "", description: v?.description ?? "", ogTitle: v?.ogTitle ?? "", ogDescription: v?.ogDescription ?? "",
  ogImage: v?.ogImage ?? "", canonicalUrl: v?.canonicalUrl ?? "", noindex: !!v?.noindex,
});

function SeoForm({ scope, label, saved, builtIn, onSaved }: { scope: string; label: string; saved: SeoValues | undefined; builtIn?: { title: string; description: string }; onSaved: () => void }) {
  const isDefault = scope === "DEFAULT";
  const ed = useEditor<SeoDraft>({
    id: `seo-${scope}`,
    initial: toSeoDraft(saved),
    successMessage: `${label}: search settings saved.`,
    save: (d) => saveSeoSettings(scope, { title: d.title, description: d.description, ogTitle: d.ogTitle, ogDescription: d.ogDescription, ogImage: d.ogImage, ...(isDefault ? {} : { canonicalUrl: d.canonicalUrl }), noindex: d.noindex }),
    onSaved,
    confirmBeforeSave: (d, s) =>
      d.noindex && !s.noindex
        ? { title: `Hide ${isDefault ? "the whole website" : label} from search engines?`, message: "Google and other search engines will be asked not to list it. You can turn this off again at any time.", confirmLabel: "Hide from search engines", danger: true }
        : null,
  });
  const d = ed.draft;
  const err = (n: string) => (ed.error?.field === n ? ed.error.message : null);
  const set = (k: keyof SeoDraft) => (e: { target: { value: string } }) => ed.setDraft({ ...d, [k]: e.target.value });
  const count = (value: string, recommended: number) => (
    <span className="cmsFieldHelp" style={value.length > recommended ? { color: "#b45309" } : undefined}>{value.length} characters · about {recommended} or fewer works best in search results</span>
  );

  return (
    <div className="contentCard">
      <div className="cmsForm">
        <p className="cmsFieldHelp">
          {isDefault
            ? "Used by every page that has no value of its own. Leave a field empty to use the website’s built-in wording."
            : "Anything you leave empty keeps what the page uses today, then the site defaults."}
        </p>
        <section className="cmsGroup">
          <h4 className="cmsGroupTitle">Search results</h4>
          <Field label="Page title" help={builtIn ? `Currently: ${builtIn.title}` : "Shown as the title in search results and the browser tab."} error={err("title")}>
            <input className="cmsInput" value={d.title} onChange={set("title")} />
          </Field>
          {count(d.title, 60)}
          <Field label="Search description" help={builtIn ? `Currently: ${builtIn.description}` : "The summary shown under the title in search results."} error={err("description")}>
            <textarea className="cmsInput cmsTextarea" rows={3} value={d.description} onChange={set("description")} />
          </Field>
          {count(d.description, 160)}
          {!isDefault && (
            <Field label="Canonical address" help="Only if this page’s main address differs from where it is shown. A full https:// address." error={err("canonicalUrl")}>
              <input className="cmsInput" value={d.canonicalUrl} onChange={set("canonicalUrl")} placeholder="https://" />
            </Field>
          )}
          <Toggle checked={d.noindex} onChange={(v) => ed.setDraft({ ...d, noindex: v })} label="Hide from search engines" help="Asks Google and others not to list this page." />
        </section>
        <section className="cmsGroup">
          <h4 className="cmsGroupTitle">When the page is shared on social media</h4>
          <Field label="Sharing title" help="Leave empty to use the page title." error={err("ogTitle")}><input className="cmsInput" value={d.ogTitle} onChange={set("ogTitle")} /></Field>
          <Field label="Sharing description" help="Leave empty to use the search description." error={err("ogDescription")}><textarea className="cmsInput cmsTextarea" rows={2} value={d.ogDescription} onChange={set("ogDescription")} /></Field>
          <Field label="Sharing image" help="A full https:// address of the picture shown in the shared link." error={err("ogImage")}><input className="cmsInput" value={d.ogImage} onChange={set("ogImage")} placeholder="https://" /></Field>
        </section>
        <SaveBar dirty={ed.dirty} saving={ed.saving} error={ed.error} onSave={ed.submit} onDiscard={ed.discard} saveLabel="Save search settings"
          fieldNames={["title", "description", "ogTitle", "ogDescription", "ogImage", "canonicalUrl", "noindex"]} />
      </div>
    </div>
  );
}

function SeoTab() {
  const { confirm, hasUnsaved } = useContentCtx();
  const [data, setData] = useState<SeoSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState("DEFAULT");
  const load = () => getSeoSettings().then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const choose = async (k: string) => {
    if (k === scope) return;
    if (hasUnsaved() && !(await confirm({ title: "Leave without saving?", message: "You have unsaved changes. They will be lost if you switch now.", confirmLabel: "Leave without saving", danger: true }))) return;
    setScope(k);
  };
  if (error) return <div className="actionErrorBanner" role="alert">{error}</div>;
  if (!data) return <Loading text="Loading search settings..." />;
  const label = SEO_SCOPES.find(([k]) => k === scope)?.[1] ?? scope;

  return (
    <>
      <div className="queueFiltersCard">
        <div className="filterTabsRow" role="tablist" aria-label="Page">
          {SEO_SCOPES.map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={scope === k} className={`filterTabBtn ${scope === k ? "filterTabActive" : ""}`} onClick={() => choose(k)}>
              <span>{l}</span>{Object.keys(data.seo[k] ?? {}).length > 0 && <span className="tabCounterPill" title="Has saved settings">✓</span>}
            </button>
          ))}
        </div>
      </div>
      <SeoForm key={scope} scope={scope} label={label} saved={data.seo[scope]} builtIn={data.builtIn[scope]} onSaved={load} />
    </>
  );
}

// ---------------------------------------------------------------------------
function SettingsInner() {
  const { navigate, search } = useRouter();
  const { hasUnsaved, confirm } = useContentCtx();
  const tab = new URLSearchParams(search).get("tab") === "seo" ? "seo" : "general";
  const [general, setGeneral] = useState<SiteGeneral | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { getSiteGeneral().then((r) => setGeneral(r.general)).catch((e) => setError(e.message)); }, []);

  const go = async (k: string) => {
    if (k === tab) return;
    if (hasUnsaved() && !(await confirm({ title: "Leave without saving?", message: "You have unsaved changes. They will be lost if you switch now.", confirmLabel: "Leave without saving", danger: true }))) return;
    navigate(k === "general" ? "/settings" : `/settings?tab=${k}`);
  };

  return (
    <div className="reviewQueuePage">
      <div className="pageHeaderSection"><div><h1 className="pageHeaderTitle">Site settings &amp; SEO</h1><p className="pageHeaderSubtitle">Brand, contact details and social links shown across the website, and how each page appears in search results and shared links. The website keeps its current values until you save a change.</p></div></div>
      <div className="queueFiltersCard"><div className="filterTabsRow" role="tablist">
        {([["general", "General"], ["seo", "Search & sharing (SEO)"]] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={`filterTabBtn ${tab === k ? "filterTabActive" : ""}`} onClick={() => go(k)}><span>{l}</span></button>
        ))}
      </div></div>
      {tab === "general" && (error ? <div className="actionErrorBanner" role="alert">{error}</div> : !general ? <Loading text="Loading settings..." /> : <GeneralForm initial={general} />)}
      {tab === "seo" && <SeoTab />}
    </div>
  );
}

export function SettingsPage({ onActionComplete }: { onActionComplete: (m: string) => void }) {
  return (
    <ContentProvider notify={onActionComplete}>
      <SettingsInner />
    </ContentProvider>
  );
}
