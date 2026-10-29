import { useEffect, useState } from "react";
import type { CountryContentRow, ListRow } from "../types";
import { createCountry, getContentLists, getCountryContent } from "../api";
import { useRouter } from "../router";
import { ContentProvider, Field, SaveBar, Toggle, WEB_URL, useContentCtx, useEditor } from "../components/contentUi";
import { CountryEditor, ListSection } from "./ContentPage";

const Loading = ({ text }: { text: string }) => (
  <div className="tableLoadingState"><div className="tableSpinner" /><p>{text}</p></div>
);

const slugFrom = (name: string) => name.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// ---------------------------------------------------------------------------
// Countries list: what is live, what is hidden, and where each country is used
// ---------------------------------------------------------------------------
export function CountriesListPage() {
  const { navigate, search } = useRouter();
  const filter = new URLSearchParams(search).get("show") || "all";
  const [rows, setRows] = useState<CountryContentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCountryContent().then(setRows).catch((e) => setError(e.message));
  }, []);

  const counts = { all: rows?.length ?? 0, available: rows?.filter((c) => c.isActive).length ?? 0, hidden: rows?.filter((c) => !c.isActive).length ?? 0 };
  const shown = (rows ?? []).filter((c) => (filter === "available" ? c.isActive : filter === "hidden" ? !c.isActive : true));
  const tabs: Array<[string, string]> = [["all", "All"], ["available", "Available"], ["hidden", "Hidden"]];

  return (
    <div className="reviewQueuePage">
      <div className="pageHeaderSection" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="pageHeaderTitle">Countries</h1>
          <p className="pageHeaderSubtitle">The countries offered on the website and in registration and job forms. Countries are never deleted: hide one to take it off the website and turn it back on at any time.</p>
        </div>
        <button type="button" className="btnApproveAction" onClick={() => navigate("/countries/new")}>Add country</button>
      </div>
      <div className="queueFiltersCard">
        <div className="filterTabsRow" role="tablist">
          {tabs.map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={filter === k} className={`filterTabBtn ${filter === k ? "filterTabActive" : ""}`} onClick={() => navigate(k === "all" ? "/countries" : `/countries?show=${k}`)}>
              <span>{l}</span><span className="tabCounterPill">{counts[k as keyof typeof counts]}</span>
            </button>
          ))}
        </div>
      </div>
      {error && <div className="actionErrorBanner" role="alert">{error}</div>}
      <div className="queueTableCard">
        {!rows && !error ? <Loading text="Loading countries..." /> : rows && shown.length === 0 ? (
          <div className="tableEmptyState"><h3 className="emptyStateTitle">{rows.length === 0 ? "No countries yet" : "No countries here"}</h3><p className="emptyStateSubtitle">{rows.length === 0 ? "Add your first country to offer it on the website." : "Try another filter."}</p></div>
        ) : rows ? (
          <div className="tableResponsiveWrap">
            <table className="queueTable">
              <thead><tr><th>Country</th><th>On the website</th><th>Cities</th><th>Guide sections</th><th>Used by</th><th /></tr></thead>
              <tbody>
                {shown.map((c) => (
                  <tr key={c.id}>
                    <td><div className="facilityNameCell"><strong>{c.nameEn}</strong><span dir="rtl" style={{ fontSize: 13 }}>{c.nameAr}</span><span className="subRefId">{c.isoCode} · /{c.slug}</span></div></td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                        <span className={`statusPill ${c.isActive ? "badgeApproved" : "badgeDraft"}`}>{c.isActive ? "Available" : "Hidden"}</span>
                        {c.isActive && <span className="subRefId">{c.isGcc ? "In the GCC destinations list" : "Forms only (not in the GCC list)"}</span>}
                        {c.isActive && <span className="subRefId">{c.isGuidePublished ? "Guide shown" : "Guide not shown"}</span>}
                      </div>
                    </td>
                    <td>{c.cities?.length ?? 0}</td>
                    <td>{c.sections.length}</td>
                    <td><span style={{ fontSize: 13, color: "#5b6e84" }}>{c.usedBy ? `${c.usedBy.jobs} job${c.usedBy.jobs === 1 ? "" : "s"}, ${c.usedBy.hospitals} hospital${c.usedBy.hospitals === 1 ? "" : "s"}` : ""}</span></td>
                    <td><button type="button" className="btnReviewAction" onClick={() => navigate(`/countries/${c.id}`)}>Manage</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add country: a full page, because it carries required identity fields
// ---------------------------------------------------------------------------
function CreateForm({ onActionComplete }: { onActionComplete: (m: string) => void }) {
  const { navigate } = useRouter();
  const { hasUnsaved, confirm } = useContentCtx();
  const [slugTouched, setSlugTouched] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const ed = useEditor({
    id: "country-new",
    initial: { nameEn: "", nameAr: "", isoCode: "", slug: "", summaryEn: "", summaryAr: "", isGcc: false },
    successMessage: "Country added. It stays hidden until you make it available.",
    validate: (d) => {
      if (!d.nameEn.trim()) return { field: "nameEn", message: "English name is required." };
      if (!d.nameAr.trim()) return { field: "nameAr", message: "Arabic name is required. Enter the approved Arabic name; it is not generated for you." };
      if (!/^[A-Za-z]{2}$/.test(d.isoCode.trim())) return { field: "isoCode", message: "Country code must be exactly 2 letters, for example SA." };
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(d.slug.trim())) return { field: "slug", message: "Use lowercase letters, numbers and single hyphens, for example saudi-arabia." };
      return null;
    },
    save: async (d) => {
      const r = await createCountry({ nameEn: d.nameEn, nameAr: d.nameAr, isoCode: d.isoCode, slug: d.slug, summaryEn: d.summaryEn || null, summaryAr: d.summaryAr || null, isGcc: d.isGcc });
      setCreatedId(r.id);
      return { message: r.message };
    },
  });
  useEffect(() => {
    if (createdId && !ed.dirty) navigate(`/countries/${createdId}`);
  }, [createdId, ed.dirty]);

  const d = ed.draft;
  const err = (n: string) => (ed.error?.field === n ? ed.error.message : null);
  const set = (patch: Partial<typeof d>) => ed.setDraft({ ...d, ...patch });
  const back = async () => {
    if (hasUnsaved() && !(await confirm({ title: "Leave without saving?", message: "This country has not been added yet. Your entries will be lost.", confirmLabel: "Leave without saving", danger: true }))) return;
    navigate("/countries");
  };

  return (
    <div className="reviewQueuePage">
      <div className="detailTopNav"><button type="button" className="backToQueueLink" onClick={back}>← Back to countries</button></div>
      <div className="pageHeaderSection"><div><h1 className="pageHeaderTitle">Add country</h1><p className="pageHeaderSubtitle">Fill in the details below. The new country starts hidden: it appears on the website only after you make it available and show its guide.</p></div></div>
      <div className="contentCard">
        <div className="cmsForm">
          <section className="cmsGroup">
            <h4 className="cmsGroupTitle">Country details</h4>
            <div className="cmsFields cmsRow">
              <Field label="Name (English) *" error={err("nameEn")}>
                <input className="cmsInput" value={d.nameEn} onChange={(e) => set({ nameEn: e.target.value, ...(slugTouched ? {} : { slug: slugFrom(e.target.value) }) })} />
              </Field>
              <Field label="Name (Arabic) *" help="Required. Enter the approved Arabic name." error={err("nameAr")}>
                <input className="cmsInput" dir="rtl" value={d.nameAr} onChange={(e) => set({ nameAr: e.target.value })} />
              </Field>
            </div>
            <div className="cmsFields cmsRow">
              <Field label="Country code *" help="Two letters, for example SA. It cannot be changed later." error={err("isoCode")} grow={false}>
                <input className="cmsInput" style={{ maxWidth: 120 }} maxLength={2} value={d.isoCode} onChange={(e) => set({ isoCode: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="Web address name *" help={`Used in the page address: ${WEB_URL}/countries/${d.slug || "…"}. It cannot be changed later.`} error={err("slug")}>
                <input className="cmsInput" value={d.slug} onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value.toLowerCase() }); }} />
              </Field>
            </div>
            <Field label="Short summary (English)" help="Optional. Shown on the country card." error={err("summaryEn")}>
              <textarea className="cmsInput cmsTextarea" rows={3} value={d.summaryEn} onChange={(e) => set({ summaryEn: e.target.value })} />
            </Field>
            <Field label="Short summary (Arabic)" help="Optional." error={err("summaryAr")}>
              <textarea className="cmsInput cmsTextarea" rows={3} dir="rtl" value={d.summaryAr} onChange={(e) => set({ summaryAr: e.target.value })} />
            </Field>
          </section>
          <section className="cmsGroup">
            <h4 className="cmsGroupTitle">Where it is used</h4>
            <Toggle checked={d.isGcc} onChange={(v) => set({ isGcc: v })} label="Include in the GCC destinations list" help="The public Countries page and the job search list GCC countries only. Other available countries still appear in registration and job forms." />
          </section>
          <SaveBar dirty={ed.dirty} saving={ed.saving} error={ed.error} onSave={ed.submit} onDiscard={ed.discard} saveLabel="Add country" fieldNames={["nameEn", "nameAr", "isoCode", "slug", "summaryEn", "summaryAr"]} />
        </div>
      </div>
    </div>
  );
}

export function CountryCreatePage({ onActionComplete }: { onActionComplete: (m: string) => void }) {
  return (
    <ContentProvider notify={onActionComplete}>
      <CreateForm onActionComplete={onActionComplete} />
    </ContentProvider>
  );
}

// ---------------------------------------------------------------------------
// Country page: details, guide sections and its cities in one place
// ---------------------------------------------------------------------------
function DetailInner({ countryId }: { countryId: string }) {
  const { navigate } = useRouter();
  const { hasUnsaved, confirm } = useContentCtx();
  const [country, setCountry] = useState<CountryContentRow | null>(null);
  const [cities, setCities] = useState<ListRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    Promise.all([getCountryContent(), getContentLists()])
      .then(([all, lists]) => {
        const found = all.find((c) => c.id === countryId) ?? null;
        if (!found) setError("This country was not found.");
        setCountry(found);
        setCities(lists.cities.filter((c) => c.countryId === countryId));
      })
      .catch((e) => setError(e.message));
  useEffect(() => { load(); }, [countryId]);

  const back = async () => {
    if (hasUnsaved() && !(await confirm({ title: "Leave without saving?", message: "You have unsaved changes. They will be lost if you leave now.", confirmLabel: "Leave without saving", danger: true }))) return;
    navigate("/countries");
  };

  if (error) return (<div className="reviewQueuePage"><div className="actionErrorBanner" role="alert">{error}</div><button type="button" className="secondaryButton" onClick={() => navigate("/countries")}>Back to countries</button></div>);
  if (!country) return <div className="reviewQueuePage"><Loading text="Loading country..." /></div>;
  const live = country.isActive && country.isGuidePublished;

  return (
    <div className="reviewQueuePage">
      <div className="detailTopNav"><button type="button" className="backToQueueLink" onClick={back}>← Back to countries</button></div>
      <div className="pageHeaderSection" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="pageHeaderTitle">{country.nameEn}</h1>
          <p className="pageHeaderSubtitle">{country.isoCode} · {country.isActive ? "Available on the website" : "Hidden from the website"}{live ? "" : country.isActive ? " · Guide not shown" : ""}</p>
        </div>
        {live && country.isGcc && <a className="btnReviewAction" href={`${WEB_URL}/countries/${country.slug}`} target="_blank" rel="noopener noreferrer">View on the website</a>}
      </div>
      <CountryEditor c={country} onChanged={load} defaultOpen />
      <ListSection list="cities" title={`Cities in ${country.nameEn}`} help="Cities offered in job and registration forms for this country. Add a city with its English and Arabic names." rows={cities} countries={[{ id: country.id, nameEn: country.nameEn }]} onCreated={load} />
    </div>
  );
}

export function CountryDetailPage({ countryId, onActionComplete }: { countryId: string; onActionComplete: (m: string) => void }) {
  return (
    <ContentProvider notify={onActionComplete}>
      <DetailInner countryId={countryId} />
    </ContentProvider>
  );
}
