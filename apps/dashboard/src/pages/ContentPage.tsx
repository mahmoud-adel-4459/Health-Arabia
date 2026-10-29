import { useEffect, useState } from "react";
import type { ContentBlockRow, CountryContentRow, FaqRow, ListRow } from "../types";
import {
  addGuideSection,
  createFaq,
  createListItem,
  getContentBlocks,
  getContentLists,
  getCountryContent,
  getFaqs,
  updateContentBlock,
  updateCountry,
  updateFaq,
  updateGuideSection,
  updateListItem,
} from "../api";
import { useRouter } from "../router";
import { ContentForm, ContentProvider, Field, SaveBar, Toggle, findContentProblems, useContentCtx, useEditor } from "../components/contentUi";

const TABS: Array<[string, string]> = [["blocks", "Website pages"], ["faqs", "FAQs"], ["cities", "Cities"], ["specialties", "Specialties"], ["options", "Dropdown lists"]];
const PAGES: Array<[string, string]> = [["HOME", "Home"], ["ABOUT", "About us"], ["COUNTRIES", "Countries"], ["HOSPITALS", "Hospitals"], ["FAQ", "FAQs"], ["CONTACT", "Contact us"], ["JOBS", "Jobs"]];
const humanize = (v: string) => v.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());

const BLOCK_INFO: Record<string, [string, string]> = {
  "HOME/hero": ["Main banner", "The large banner at the top of the home page, including the job search."],
  "HOME/stats": ["Statistics strip", "The row of key numbers under the banner."],
  "HOME/latest-jobs": ["Latest opportunities", "Heading and wording around the newest jobs."],
  "HOME/cv-banner": ["Upload your CV banner", "The banner asking doctors to upload their CV."],
  "HOME/partners": ["Partners", "Partner logos and their heading."],
  "HOME/testimonials": ["Success stories heading", "The heading above the doctors’ success stories."],
  "HOME/team-cta": ["Build your team call-to-action", "The banner inviting hospitals to request staff."],
  "HOME/partner-with-us": ["Partner with us cards", "The cards inviting doctors and hospitals to join."],
  "ABOUT/hero": ["Page banner", "The banner at the top of the About page."],
  "ABOUT/vision-mission": ["Vision and mission", "The two statements about the company’s vision and mission."],
  "ABOUT/approach": ["Our approach", "The steps that describe how the company works."],
  "ABOUT/why-choose-us": ["Why choose us", "The list of reasons to choose the company."],
  "COUNTRIES/hero": ["Page banner", "The banner at the top of the Countries page."],
  "HOSPITALS/hero": ["Page banner", "The banner at the top of the Hospitals page."],
  "FAQ/hero": ["Page banner", "The banner at the top of the FAQs page."],
  "CONTACT/hero": ["Page banner", "The banner at the top of the Contact page."],
  "CONTACT/direct-contacts": ["Contact details", "Phone number, address, opening hours and map."],
  "JOBS/hero": ["Page banner and search", "The banner at the top of the Jobs page, including the search box."],
};
const blockName = (b: { page: string; key: string }) => {
  const [name, help] = BLOCK_INFO[`${b.page}/${b.key}`] ?? [humanize(b.key), ""];
  return { name: `${PAGES.find(([k]) => k === b.page)?.[1] ?? humanize(b.page)} · ${name}`, help };
};

const Loading = ({ text }: { text: string }) => (
  <div className="tableLoadingState"><div className="tableSpinner" /><p>{text}</p></div>
);
const num = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : NaN);
const sortError = (v: string) => (Number.isNaN(num(v)) ? "Enter a whole number, for example 1." : null);

// ---------------- Website pages (CMS blocks) ----------------
function BlockEditor({ b }: { b: ContentBlockRow }) {
  const [open, setOpen] = useState(false);
  const [showProblems, setShowProblems] = useState(false);
  const info = blockName(b);
  const hasData = b.data !== null && typeof b.data === "object";
  const initial = { title: b.title ?? "", body: b.body ?? "", data: (b.data ?? null) as any, sortOrder: String(b.sortOrder), isPublished: b.isPublished };
  const ed = useEditor({
    id: `block-${b.id}`,
    initial,
    successMessage: `“${info.name}” saved.`,
    validate: (d) => {
      if (sortError(d.sortOrder)) return { field: "sortOrder", message: sortError(d.sortOrder)! };
      if (d.data && findContentProblems(d.data).length) {
        setShowProblems(true);
        return { field: "data", message: "Some links need attention. Please fix the highlighted fields and save again." };
      }
      return null;
    },
    confirmBeforeSave: (d, saved) =>
      saved.isPublished && !d.isPublished
        ? { title: "Hide this section from the website?", message: `“${info.name}” will no longer appear on the public website until you show it again.`, confirmLabel: "Hide section", danger: true }
        : null,
    save: (d) =>
      updateContentBlock(b.id, { title: d.title.trim() || null, body: d.body.trim() || null, data: d.data, sortOrder: num(d.sortOrder), isPublished: d.isPublished }),
  });
  const d = ed.draft;
  const fieldErr = (f: string) => (ed.error?.field === f ? ed.error.message : null);
  const rtl = b.locale === "AR";
  return (
    <div className="contentCard">
      <button type="button" className="cmsCardHeader" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>
          <strong className="cardTitle" style={{ display: "block" }}>{info.name}</strong>
          {info.help && <span className="cmsFieldHelp">{info.help}</span>}
        </span>
        <span className="cmsHeaderBadges">
          {ed.dirty && <span className="cmsUnsavedBadge">Unsaved</span>}
          <span className="cardPill">{d.isPublished ? "Visible" : "Hidden"}</span>
          <span className="cardPill">{open ? "Close" : "Edit"}</span>
        </span>
      </button>
      {open && (
        <div className="cmsForm">
          {(b.title !== null || d.title) && (
            <Field label="Heading" help="The main title of this section." error={fieldErr("title")}>
              <input className="cmsInput" dir={rtl ? "rtl" : undefined} value={d.title} maxLength={300} onChange={(e) => ed.setDraft({ ...d, title: e.target.value })} />
            </Field>
          )}
          {(b.body !== null || d.body) && (
            <Field label="Description text" help="The paragraph shown under the heading." error={fieldErr("body")}>
              <textarea className="cmsInput cmsTextarea" rows={4} dir={rtl ? "rtl" : undefined} value={d.body} onChange={(e) => ed.setDraft({ ...d, body: e.target.value })} />
            </Field>
          )}
          {hasData && d.data && <ContentForm value={d.data} blockKey={b.key} rtl={rtl} showProblems={showProblems} onChange={(data) => ed.setDraft({ ...d, data })} />}
          <section className="cmsGroup">
            <h4 className="cmsGroupTitle">Display on the website</h4>
            <Toggle checked={d.isPublished} onChange={(v) => ed.setDraft({ ...d, isPublished: v })} label="Show this section on the website" help="Turn off to hide it without losing the content." />
            <Field label="Position on the page" help="Sections with lower numbers appear first." error={fieldErr("sortOrder")} grow={false}>
              <input className="cmsInput" style={{ maxWidth: 120 }} inputMode="numeric" value={d.sortOrder} onChange={(e) => ed.setDraft({ ...d, sortOrder: e.target.value })} />
            </Field>
          </section>
          <SaveBar dirty={ed.dirty} saving={ed.saving} error={ed.error} onSave={ed.submit} onDiscard={ed.discard} fieldNames={["title", "body", "sortOrder"]} />
        </div>
      )}
    </div>
  );
}

function BlocksTab() {
  const [page, setPage] = useState("HOME");
  const [locale, setLocale] = useState("EN");
  const [rows, setRows] = useState<ContentBlockRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { hasUnsaved, confirm } = useContentCtx();
  useEffect(() => {
    setRows(null);
    setError(null);
    getContentBlocks({ page, locale }).then(setRows).catch((e) => setError(e.message));
  }, [page, locale]);
  const guard = async (apply: () => void) => {
    if (hasUnsaved() && !(await confirm({ title: "Leave without saving?", message: "You have unsaved changes on this page. They will be lost.", confirmLabel: "Leave without saving", danger: true }))) return;
    apply();
  };
  return (
    <>
      <div className="queueFiltersCard" style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
        <Field label="Page" grow={false}><select className="cmsInput" value={page} onChange={(e) => guard(() => setPage(e.target.value))}>{PAGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="Language" grow={false}><select className="cmsInput" value={locale} onChange={(e) => guard(() => setLocale(e.target.value))}><option value="EN">English</option><option value="AR">Arabic (right-to-left)</option></select></Field>
      </div>
      {error && <div className="actionErrorBanner" role="alert">{error}</div>}
      {!rows ? <Loading text="Loading content..." /> : rows.length === 0 ? (
        <div className="tableEmptyState">
          <h3 className="emptyStateTitle">No {locale === "AR" ? "Arabic" : "English"} content for this page yet</h3>
          <p className="emptyStateSubtitle">{locale === "AR" ? "Until Arabic content exists, visitors see the English version. Adding new Arabic sections is not available yet." : "This page has no editable sections."}</p>
        </div>
      ) : rows.map((b) => <BlockEditor key={b.id} b={b} />)}
    </>
  );
}

// ---------------- FAQs ----------------
function FaqEditor({ f }: { f: FaqRow }) {
  const ed = useEditor({
    id: `faq-${f.id}`,
    initial: { question: f.question, answer: f.answer, sortOrder: String(f.sortOrder), isPublished: f.isPublished },
    successMessage: "FAQ saved.",
    validate: (d) => (sortError(d.sortOrder) ? { field: "sortOrder", message: sortError(d.sortOrder)! } : null),
    confirmBeforeSave: (d, s) => (s.isPublished && !d.isPublished ? { title: "Hide this FAQ?", message: "It will no longer appear on the public FAQs page until you show it again.", confirmLabel: "Hide FAQ", danger: true } : null),
    save: (d) => updateFaq(f.id, { question: d.question, answer: d.answer, sortOrder: num(d.sortOrder), isPublished: d.isPublished }),
  });
  const d = ed.draft;
  const err = (n: string) => (ed.error?.field === n ? ed.error.message : null);
  const rtl = f.locale === "AR";
  return (
    <div className="contentCard">
      <div className="cardHeader">
        <h2 className="cardTitle">{f.locale === "AR" ? "Arabic" : "English"} question</h2>
        <span className="cmsHeaderBadges">{ed.dirty && <span className="cmsUnsavedBadge">Unsaved</span>}<span className="cardPill">{d.isPublished ? "Visible" : "Hidden"}</span></span>
      </div>
      <div className="cmsForm">
        <Field label="Question" error={err("question")}><input className="cmsInput" dir={rtl ? "rtl" : undefined} value={d.question} maxLength={500} onChange={(e) => ed.setDraft({ ...d, question: e.target.value })} /></Field>
        <Field label="Answer" error={err("answer")}><textarea className="cmsInput cmsTextarea" rows={3} dir={rtl ? "rtl" : undefined} value={d.answer} onChange={(e) => ed.setDraft({ ...d, answer: e.target.value })} /></Field>
        <Toggle checked={d.isPublished} onChange={(v) => ed.setDraft({ ...d, isPublished: v })} label="Show on the FAQs page" />
        <Field label="Position in the list" help="Lower numbers appear first." error={err("sortOrder")} grow={false}><input className="cmsInput" style={{ maxWidth: 120 }} inputMode="numeric" value={d.sortOrder} onChange={(e) => ed.setDraft({ ...d, sortOrder: e.target.value })} /></Field>
        <SaveBar dirty={ed.dirty} saving={ed.saving} error={ed.error} onSave={ed.submit} onDiscard={ed.discard} fieldNames={["question", "answer", "sortOrder"]} />
      </div>
    </div>
  );
}

// Small form state for "add new" panels: keeps what was typed if saving fails
function useAdder<T>(blank: T, create: (v: T) => Promise<unknown>, successMessage: string, onDone: () => void) {
  const { notify } = useContentCtx();
  const [v, setV] = useState<T>(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ field?: string | null; message: string } | null>(null);
  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await create(v);
      setV(blank);
      notify(successMessage);
      onDone();
    } catch (e: any) {
      setError({ field: e?.field ?? null, message: e?.message || "Could not save. Please try again." });
    } finally {
      setSaving(false);
    }
  };
  return { v, setV, saving, error, submit };
}

function FaqsTab() {
  const [rows, setRows] = useState<FaqRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => getFaqs().then(setRows).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const add = useAdder({ locale: "EN", question: "", answer: "" }, (v) => createFaq({ ...v, sortOrder: rows?.filter((r) => r.locale === v.locale).length ?? 0, isPublished: false }), "FAQ added. It is hidden until you switch it on.", load);
  const err = (n: string) => (add.error?.field === n ? add.error.message : null);
  return (
    <>
      <div className="contentCard">
        <div className="cardHeader"><h2 className="cardTitle">Add a new question</h2><span className="cardPill">Starts hidden</span></div>
        <div className="cmsForm">
          <Field label="Language" grow={false}><select className="cmsInput" value={add.v.locale} onChange={(e) => add.setV({ ...add.v, locale: e.target.value })}><option value="EN">English</option><option value="AR">Arabic (right-to-left)</option></select></Field>
          <Field label="Question" error={err("question")}><input className="cmsInput" dir={add.v.locale === "AR" ? "rtl" : undefined} value={add.v.question} onChange={(e) => add.setV({ ...add.v, question: e.target.value })} /></Field>
          <Field label="Answer" error={err("answer")}><textarea className="cmsInput cmsTextarea" rows={3} dir={add.v.locale === "AR" ? "rtl" : undefined} value={add.v.answer} onChange={(e) => add.setV({ ...add.v, answer: e.target.value })} /></Field>
          {add.error && !["question", "answer"].includes(add.error.field ?? "") && <div className="cmsSaveError" role="alert">{add.error.message}</div>}
          <div><button type="button" className="btnApproveAction" disabled={add.saving} onClick={add.submit}>{add.saving ? "Adding..." : "Add question"}</button></div>
        </div>
      </div>
      {error && <div className="actionErrorBanner" role="alert">{error}</div>}
      {!rows ? <Loading text="Loading FAQs..." /> : rows.length === 0 ? <div className="tableEmptyState"><h3 className="emptyStateTitle">No questions yet</h3></div> : rows.map((f) => <FaqEditor key={f.id} f={f} />)}
    </>
  );
}

// ---------------- Countries & guides ----------------
function SectionEditor({ s }: { s: CountryContentRow["sections"][number] }) {
  const ed = useEditor({
    id: `section-${s.id}`,
    initial: { title: s.title, body: s.body, sortOrder: String(s.sortOrder) },
    successMessage: "Guide section saved.",
    validate: (d) => (sortError(d.sortOrder) ? { field: "sortOrder", message: sortError(d.sortOrder)! } : null),
    save: (d) => updateGuideSection(s.id, { title: d.title, body: d.body, sortOrder: num(d.sortOrder) }),
  });
  const d = ed.draft;
  const err = (n: string) => (ed.error?.field === n ? ed.error.message : null);
  const rtl = s.locale === "AR";
  return (
    <div className="cmsRepeatCard">
      <div className="cmsRepeatHeader"><strong>{s.locale === "AR" ? "Arabic" : "English"} section{ed.dirty ? "" : ""}</strong>{ed.dirty && <span className="cmsUnsavedBadge">Unsaved</span>}</div>
      <div className="cmsForm">
        <Field label="Section title" error={err("title")}><input className="cmsInput" dir={rtl ? "rtl" : undefined} value={d.title} onChange={(e) => ed.setDraft({ ...d, title: e.target.value })} /></Field>
        <Field label="Section text" error={err("body")}><textarea className="cmsInput cmsTextarea" rows={4} dir={rtl ? "rtl" : undefined} value={d.body} onChange={(e) => ed.setDraft({ ...d, body: e.target.value })} /></Field>
        <Field label="Position" help="Lower numbers appear first." error={err("sortOrder")} grow={false}><input className="cmsInput" style={{ maxWidth: 100 }} value={d.sortOrder} onChange={(e) => ed.setDraft({ ...d, sortOrder: e.target.value })} /></Field>
        <SaveBar dirty={ed.dirty} saving={ed.saving} error={ed.error} onSave={ed.submit} onDiscard={ed.discard} saveLabel="Save section" fieldNames={["title", "body", "sortOrder"]} />
      </div>
    </div>
  );
}

export function CountryEditor({ c, onChanged, defaultOpen = false }: { c: CountryContentRow; onChanged: () => void; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const ed = useEditor({
    id: `country-${c.id}`,
    initial: { nameEn: c.nameEn, nameAr: c.nameAr, summaryEn: c.summaryEn ?? "", summaryAr: c.summaryAr ?? "", sortOrder: String(c.sortOrder), isActive: c.isActive, isGuidePublished: c.isGuidePublished, isGcc: c.isGcc },
    successMessage: `${c.nameEn} saved.`,
    validate: (d) => (sortError(d.sortOrder) ? { field: "sortOrder", message: sortError(d.sortOrder)! } : null),
    confirmBeforeSave: (d, s) =>
      s.isActive && !d.isActive
        ? { title: `Make ${c.nameEn} unavailable?`, message: "It will disappear from the website and from forms. Jobs and records that use it are kept.", confirmLabel: "Make unavailable", danger: true }
        : s.isGuidePublished && !d.isGuidePublished
        ? { title: `Hide the ${c.nameEn} guide?`, message: "Visitors will no longer see this country’s guide until you publish it again.", confirmLabel: "Hide guide", danger: true }
        : null,
    save: (d) => updateCountry(c.id, { nameEn: d.nameEn, nameAr: d.nameAr, summaryEn: d.summaryEn || null, summaryAr: d.summaryAr || null, sortOrder: num(d.sortOrder), isActive: d.isActive, isGuidePublished: d.isGuidePublished, isGcc: d.isGcc }),
  });
  const d = ed.draft;
  const err = (n: string) => (ed.error?.field === n ? ed.error.message : null);
  const add = useAdder({ locale: "EN", title: "", body: "" }, (v) => addGuideSection(c.id, { ...v, sortOrder: c.sections.filter((s) => s.locale === v.locale).length }), "Guide section added.", onChanged);
  const addErr = (n: string) => (add.error?.field === n ? add.error.message : null);
  return (
    <div className="contentCard">
      <button type="button" className="cmsCardHeader" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span><strong className="cardTitle" style={{ display: "block" }}>{c.nameEn}</strong><span className="cmsFieldHelp">{c.sections.length} guide section{c.sections.length === 1 ? "" : "s"}</span></span>
        <span className="cmsHeaderBadges">{ed.dirty && <span className="cmsUnsavedBadge">Unsaved</span>}<span className="cardPill">{d.isActive ? "Available" : "Unavailable"}</span><span className="cardPill">{open ? "Close" : "Edit"}</span></span>
      </button>
      {open && (
        <div className="cmsForm">
          <section className="cmsGroup">
            <h4 className="cmsGroupTitle">Country details</h4>
            <div className="cmsFields cmsRow">
              <Field label="Name (English)" error={err("nameEn")}><input className="cmsInput" value={d.nameEn} onChange={(e) => ed.setDraft({ ...d, nameEn: e.target.value })} /></Field>
              <Field label="Name (Arabic)" error={err("nameAr")}><input className="cmsInput" dir="rtl" value={d.nameAr} onChange={(e) => ed.setDraft({ ...d, nameAr: e.target.value })} /></Field>
            </div>
            <Field label="Short summary (English)" help="Shown on the country card." error={err("summaryEn")}><textarea className="cmsInput cmsTextarea" rows={3} value={d.summaryEn} onChange={(e) => ed.setDraft({ ...d, summaryEn: e.target.value })} /></Field>
            <Field label="Short summary (Arabic)" error={err("summaryAr")}><textarea className="cmsInput cmsTextarea" rows={3} dir="rtl" value={d.summaryAr} onChange={(e) => ed.setDraft({ ...d, summaryAr: e.target.value })} /></Field>
          </section>
          <section className="cmsGroup">
            <h4 className="cmsGroupTitle">Display on the website</h4>
            <Toggle checked={d.isActive} onChange={(v) => ed.setDraft({ ...d, isActive: v })} label="Country is available" help="Turn off to remove it from the website and forms without deleting it." />
            <Toggle checked={d.isGuidePublished} onChange={(v) => ed.setDraft({ ...d, isGuidePublished: v })} label="Show the country guide" />
            <Toggle checked={d.isGcc} onChange={(v) => ed.setDraft({ ...d, isGcc: v })} label="Include in the GCC destinations list" help="The public Countries page and the job search list GCC countries only. Other available countries still appear in registration and job forms." />
            <Field label="Position in the list" help="Lower numbers appear first." error={err("sortOrder")} grow={false}><input className="cmsInput" style={{ maxWidth: 120 }} value={d.sortOrder} onChange={(e) => ed.setDraft({ ...d, sortOrder: e.target.value })} /></Field>
          </section>
          <SaveBar dirty={ed.dirty} saving={ed.saving} error={ed.error} onSave={ed.submit} onDiscard={ed.discard} saveLabel="Save country" fieldNames={["nameEn", "nameAr", "summaryEn", "summaryAr", "sortOrder"]} />
          <section className="cmsGroup">
            <h4 className="cmsGroupTitle">Guide sections</h4>
            {c.sections.length === 0 && <p className="cmsFieldHelp">No guide sections yet.</p>}
            {c.sections.map((s) => <SectionEditor key={s.id} s={s} />)}
            <div className="cmsRepeatCard cmsAddCard">
              <div className="cmsRepeatHeader"><strong>Add a guide section</strong></div>
              <div className="cmsForm">
                <Field label="Language" grow={false}><select className="cmsInput" value={add.v.locale} onChange={(e) => add.setV({ ...add.v, locale: e.target.value })}><option value="EN">English</option><option value="AR">Arabic (right-to-left)</option></select></Field>
                <Field label="Section title" error={addErr("title")}><input className="cmsInput" dir={add.v.locale === "AR" ? "rtl" : undefined} value={add.v.title} onChange={(e) => add.setV({ ...add.v, title: e.target.value })} /></Field>
                <Field label="Section text" error={addErr("body")}><textarea className="cmsInput cmsTextarea" rows={3} dir={add.v.locale === "AR" ? "rtl" : undefined} value={add.v.body} onChange={(e) => add.setV({ ...add.v, body: e.target.value })} /></Field>
                {add.error && !["title", "body"].includes(add.error.field ?? "") && <div className="cmsSaveError" role="alert">{add.error.message}</div>}
                <div><button type="button" className="btnReviewAction" disabled={add.saving} onClick={add.submit}>{add.saving ? "Adding..." : "Add section"}</button></div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

// ---------------- Cities, specialties, dropdown lists ----------------
function ListRowEditor({ list, r, showSymbol, columns }: { list: string; r: ListRow; showSymbol: boolean; columns: number }) {
  const ed = useEditor({
    id: `list-${list}-${r.id}`,
    initial: { nameEn: r.nameEn, nameAr: r.nameAr, sortOrder: String(r.sortOrder), isActive: r.isActive, symbol: r.symbol ?? "" },
    successMessage: `“${r.nameEn}” saved.`,
    validate: (d) => (sortError(d.sortOrder) ? { field: "sortOrder", message: sortError(d.sortOrder)! } : null),
    confirmBeforeSave: (d, s) => (s.isActive && !d.isActive ? { title: `Stop offering “${r.nameEn}”?`, message: "It will no longer appear in forms and filters. Records that already use it keep it, and you can turn it back on at any time.", confirmLabel: "Stop offering", danger: true } : null),
    save: (d) => updateListItem(list, r.id, { nameEn: d.nameEn, nameAr: d.nameAr, sortOrder: num(d.sortOrder), isActive: d.isActive, ...(showSymbol ? { symbol: d.symbol || null } : {}) }),
  });
  const d = ed.draft;
  const bad = (n: string) => (ed.error?.field === n ? "cmsFieldError" : "");
  return (
    <>
      <tr className={ed.dirty ? "cmsRowDirty" : ""}>
        <td style={{ minWidth: 120 }}><strong>{r.code ?? r.country ?? ""}</strong>{r.country && r.code && <div className="subRefId">{r.country}</div>}{r.country && !r.code && <div className="subRefId">City</div>}</td>
        <td><input className={`cmsInput ${bad("nameEn")}`} aria-label={`English name for ${r.nameEn}`} value={d.nameEn} onChange={(e) => ed.setDraft({ ...d, nameEn: e.target.value })} /></td>
        <td><input className={`cmsInput ${bad("nameAr")}`} dir="rtl" aria-label={`Arabic name for ${r.nameEn}`} value={d.nameAr} onChange={(e) => ed.setDraft({ ...d, nameAr: e.target.value })} /></td>
        {showSymbol && <td><input className={`cmsInput ${bad("symbol")}`} style={{ width: 70 }} aria-label={`Symbol for ${r.nameEn}`} value={d.symbol} onChange={(e) => ed.setDraft({ ...d, symbol: e.target.value })} /></td>}
        <td><input className={`cmsInput ${bad("sortOrder")}`} style={{ width: 70 }} inputMode="numeric" aria-label={`Position of ${r.nameEn}`} value={d.sortOrder} onChange={(e) => ed.setDraft({ ...d, sortOrder: e.target.value })} /></td>
        <td><Toggle checked={d.isActive} onChange={(v) => ed.setDraft({ ...d, isActive: v })} label={d.isActive ? "Offered" : "Not offered"} /></td>
        <td>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
            {ed.dirty && <span className="cmsUnsavedBadge">Unsaved</span>}
            <button type="button" className="btnReviewAction" disabled={!ed.dirty || ed.saving} onClick={ed.submit}>{ed.saving ? "Saving..." : "Save"}</button>
            {ed.dirty && <button type="button" className="cmsLinkBtn" onClick={ed.discard}>Discard</button>}
          </div>
        </td>
      </tr>
      {ed.error && <tr><td colSpan={columns}><div className="cmsSaveError" role="alert">{ed.error.message}</div></td></tr>}
    </>
  );
}

export function ListSection({ list, title, help, rows, countries, onCreated }: { list: string; title: string; help: string; rows: ListRow[]; countries?: Array<{ id: string; nameEn: string }>; onCreated: () => void }) {
  const needsCode = !["cities", "specialties"].includes(list);
  const isCur = list === "currencies";
  const blankNew = { nameEn: "", nameAr: "", code: "", symbol: "", countryId: countries?.[0]?.id ?? "" };
  const add = useAdder(blankNew, (v) => createListItem(list, { nameEn: v.nameEn, nameAr: v.nameAr, sortOrder: rows.length, ...(needsCode ? { code: v.code } : {}), ...(isCur ? { symbol: v.symbol || null } : {}), ...(list === "cities" ? { countryId: v.countryId } : {}) }), `${title}: new entry added.`, onCreated);
  useEffect(() => { if (list === "cities" && !add.v.countryId && countries?.[0]) add.setV({ ...add.v, countryId: countries[0].id }); }, [countries]);
  const columns = 6 + (isCur ? 1 : 0);
  const e = (n: string) => (add.error?.field === n ? add.error.message : null);
  return (
    <div className="contentCard">
      <div className="cardHeader"><div><h2 className="cardTitle">{title} ({rows.length})</h2><span className="cmsFieldHelp">{help}</span></div></div>
      <div className="tableResponsiveWrap">
        <table className="queueTable">
          <thead><tr><th>{needsCode ? "Reference" : list === "cities" ? "Country" : "Name"}</th><th>English name</th><th>Arabic name</th>{isCur && <th>Symbol</th>}<th>Position</th><th>On the website</th><th>Save</th></tr></thead>
          <tbody>{rows.map((r) => <ListRowEditor key={r.id} list={list} r={r} showSymbol={isCur} columns={columns} />)}</tbody>
        </table>
      </div>
      <div className="cmsRepeatCard cmsAddCard" style={{ marginTop: 14 }}>
        <div className="cmsRepeatHeader"><strong>Add a new entry</strong></div>
        <div className="cmsFields cmsRow">
          {list === "cities" && <Field label="Country"><select className="cmsInput" value={add.v.countryId} onChange={(ev) => add.setV({ ...add.v, countryId: ev.target.value })}>{countries?.map((c) => <option key={c.id} value={c.id}>{c.nameEn}</option>)}</select></Field>}
          {needsCode && <Field label="Reference" help={isCur ? "3 letters, e.g. SAR" : "Capital letters, e.g. PART_TIME"} error={e("code")}><input className="cmsInput" value={add.v.code} onChange={(ev) => add.setV({ ...add.v, code: ev.target.value })} /></Field>}
          <Field label="English name" error={e("nameEn")}><input className="cmsInput" value={add.v.nameEn} onChange={(ev) => add.setV({ ...add.v, nameEn: ev.target.value })} /></Field>
          <Field label="Arabic name" error={e("nameAr")}><input className="cmsInput" dir="rtl" value={add.v.nameAr} onChange={(ev) => add.setV({ ...add.v, nameAr: ev.target.value })} /></Field>
          {isCur && <Field label="Symbol" error={e("symbol")}><input className="cmsInput" value={add.v.symbol} onChange={(ev) => add.setV({ ...add.v, symbol: ev.target.value })} /></Field>}
        </div>
        {add.error && !["code", "nameEn", "nameAr", "symbol"].includes(add.error.field ?? "") && <div className="cmsSaveError" role="alert">{add.error.message}</div>}
        <div><button type="button" className="btnReviewAction" disabled={add.saving} onClick={add.submit}>{add.saving ? "Adding..." : "Add entry"}</button></div>
      </div>
    </div>
  );
}

function ListsTab({ which }: { which: "cities" | "specialties" | "options" }) {
  const [lists, setLists] = useState<Record<string, ListRow[]> | null>(null);
  const [countries, setCountries] = useState<Array<{ id: string; nameEn: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const load = () => getContentLists().then(setLists).catch((e) => setError(e.message));
  useEffect(() => { load(); getCountryContent().then((c) => setCountries(c.map((x) => ({ id: x.id, nameEn: x.nameEn })))).catch(() => undefined); }, []);
  if (error) return <div className="actionErrorBanner" role="alert">{error}</div>;
  if (!lists) return <Loading text="Loading lists..." />;
  if (which === "cities") return <ListSection list="cities" title="Cities" help="Cities offered in job and registration forms." rows={lists.cities} countries={countries} onCreated={load} />;
  if (which === "specialties") return <ListSection list="specialties" title="Medical specialties" help="Specialties offered when posting jobs and registering." rows={lists.specialties} onCreated={load} />;
  return (
    <>
      <div className="noticeBanner pendingBanner">“Notice period” and “How did you hear about us” choices are not editable here yet: they are waiting for values approved by the client.</div>
      <ListSection list="employment-types" title="Employment types" help="For example Permanent or Contract." rows={lists["employment-types"]} onCreated={load} />
      <ListSection list="salary-periods" title="Salary periods" help="For example per month or per year." rows={lists["salary-periods"]} onCreated={load} />
      <ListSection list="currencies" title="Currencies" help="Currencies offered for salaries." rows={lists.currencies} onCreated={load} />
      <ListSection list="contact-subjects" title="Contact form subjects" help="Subjects visitors can choose when they write to you." rows={lists["contact-subjects"]} onCreated={load} />
    </>
  );
}

function ContentInner() {
  const { navigate, search } = useRouter();
  const { hasUnsaved, confirm } = useContentCtx();
  const tab = new URLSearchParams(search).get("tab") || "blocks";
  useEffect(() => { if (tab === "countries") navigate("/countries", { replace: true }); }, [tab]);
  const go = async (k: string) => {
    if (k === tab) return;
    if (hasUnsaved() && !(await confirm({ title: "Leave without saving?", message: "You have unsaved changes. They will be lost if you switch now.", confirmLabel: "Leave without saving", danger: true }))) return;
    navigate(`/reference-data?tab=${k}`);
  };
  return (
    <div className="reviewQueuePage">
      <div className="pageHeaderSection"><div><h1 className="pageHeaderTitle">Site content &amp; lists</h1><p className="pageHeaderSubtitle">Edit the wording and choices visitors see on the website. Nothing is ever deleted: you can hide content or stop offering a choice and turn it back on later. Every change is saved to the activity history.</p></div></div>
      <div className="queueFiltersCard"><div className="filterTabsRow" role="tablist">
        {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={`filterTabBtn ${tab === k ? "filterTabActive" : ""}`} onClick={() => go(k)}><span>{l}</span></button>)}
      </div></div>
      {tab === "blocks" && <BlocksTab />}
      {tab === "faqs" && <FaqsTab />}
      {tab === "cities" && <ListsTab which="cities" />}
      {tab === "specialties" && <ListsTab which="specialties" />}
      {tab === "options" && <ListsTab which="options" />}
    </div>
  );
}

export function ContentPage({ onActionComplete }: { onActionComplete: (message: string) => void }) {
  return (
    <ContentProvider notify={onActionComplete}>
      <ContentInner />
    </ContentProvider>
  );
}
