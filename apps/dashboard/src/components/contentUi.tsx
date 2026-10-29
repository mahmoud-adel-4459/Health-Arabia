import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Shared building blocks for the content editors: confirmations, save state, form fields,
// and a form renderer that turns a block's stored structure into plain-language fields.
// Editors work on a deep copy of the stored content and change only the fields the admin edits,
// so fields the forms do not know about are saved back exactly as they were.
// ---------------------------------------------------------------------------

export const WEB_URL = (import.meta as any).env?.VITE_WEB_URL || "http://localhost:3000";

// ---------------- Confirmation dialog + notifications + unsaved registry ----------------
interface ConfirmOptions { title: string; message: string; confirmLabel: string; danger?: boolean }
interface ContentCtxValue {
  notify: (message: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  registerDirty: (id: string, dirty: boolean) => void;
  hasUnsaved: () => boolean;
}
const ContentCtx = createContext<ContentCtxValue | null>(null);
export const useContentCtx = () => {
  const ctx = useContext(ContentCtx);
  if (!ctx) throw new Error("ContentProvider missing");
  return ctx;
};

export function ContentProvider({ notify, children }: { notify: (m: string) => void; children: React.ReactNode }) {
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const dirty = useRef(new Set<string>());

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...options, resolve })), []);
  const registerDirty = useCallback((id: string, isDirty: boolean) => {
    if (isDirty) dirty.current.add(id);
    else dirty.current.delete(id);
  }, []);
  const hasUnsaved = useCallback(() => dirty.current.size > 0, []);

  // Browser-level warning when closing or reloading the tab with unsaved edits
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty.current.size > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const close = (value: boolean) => {
    dialog?.resolve(value);
    setDialog(null);
  };
  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dialog]);

  return (
    <ContentCtx.Provider value={{ notify, confirm, registerDirty, hasUnsaved }}>
      {children}
      {dialog && (
        <div className="modalBackdrop" role="presentation" onClick={() => close(false)}>
          <div className="modalCard" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(e) => e.stopPropagation()}>
            <h2 className="modalTitle" id="confirm-title">{dialog.title}</h2>
            <p className="modalBodyText">{dialog.message}</p>
            <div className="modalActionRow">
              <button type="button" className="modalCancelBtn" autoFocus onClick={() => close(false)}>Keep editing</button>
              <button type="button" className={dialog.danger ? "btnReject" : "btnApprove"} onClick={() => close(true)}>{dialog.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}
    </ContentCtx.Provider>
  );
}

// ---------------- Editor state: draft, unsaved detection, save with feedback ----------------
export interface SaveError { field?: string | null; message: string }
interface EditorOptions<T> {
  id: string;
  initial: T;
  save: (draft: T) => Promise<{ message?: string; changed?: boolean }>;
  successMessage: string;
  // Return a confirmation to ask for before saving, e.g. when content is being hidden
  confirmBeforeSave?: (draft: T, saved: T) => ConfirmOptions | null;
  validate?: (draft: T) => SaveError | null;
  onSaved?: () => void;
}

export function useEditor<T>({ id, initial, save, successMessage, confirmBeforeSave, validate, onSaved }: EditorOptions<T>) {
  const { notify, confirm, registerDirty } = useContentCtx();
  const [saved, setSaved] = useState<T>(initial);
  const [draft, setDraft] = useState<T>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<SaveError | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  useEffect(() => {
    registerDirty(id, dirty);
    return () => registerDirty(id, false);
  }, [id, dirty]);

  const submit = async () => {
    if (!dirty || saving) return;
    const problem = validate?.(draft) ?? null;
    if (problem) {
      setError(problem);
      return;
    }
    const ask = confirmBeforeSave?.(draft, saved);
    if (ask && !(await confirm(ask))) return;
    setSaving(true);
    setError(null);
    try {
      await save(draft);
      setSaved(draft);
      notify(successMessage);
      onSaved?.();
    } catch (e: any) {
      // The draft is kept exactly as typed so nothing the admin entered is lost
      setError({ field: e?.field ?? null, message: e?.message || "Could not save. Please try again." });
    } finally {
      setSaving(false);
    }
  };
  const discard = () => {
    setDraft(saved);
    setError(null);
  };
  return { draft, setDraft, dirty, saving, error, setError, submit, discard };
}

// ---------------- Small UI pieces ----------------
export function Field({ label, help, error, children, grow = true }: { label: string; help?: string; error?: string | null; children: React.ReactNode; grow?: boolean }) {
  return (
    <label className={`cmsField ${error ? "cmsFieldError" : ""}`} style={grow ? undefined : { flex: "0 0 auto" }}>
      <span className="cmsFieldLabel">{label}</span>
      {help && <span className="cmsFieldHelp">{help}</span>}
      {children}
      {error && <span className="cmsFieldErrorText" role="alert">{error}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label, help }: { checked: boolean; onChange: (v: boolean) => void; label: string; help?: string }) {
  return (
    <label className="cmsToggle">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="cmsToggleTrack" aria-hidden="true" />
      <span className="cmsToggleText">
        <strong>{label}</strong>
        {help && <small>{help}</small>}
      </span>
    </label>
  );
}

export function SaveBar({ dirty, saving, error, onSave, onDiscard, saveLabel = "Save changes", fieldNames }: { dirty: boolean; saving: boolean; error: SaveError | null; onSave: () => void; onDiscard: () => void; saveLabel?: string; fieldNames?: string[] }) {
  // Show the message here unless it belongs to a field that displays it inline
  const inline = error?.field && fieldNames?.includes(error.field);
  return (
    <div className="cmsSaveBar">
      <div className="cmsSaveStatus" role="status">
        {saving ? <span>Saving...</span> : dirty ? <span className="cmsUnsaved">● Unsaved changes</span> : <span style={{ color: "#047857" }}>All changes saved</span>}
      </div>
      {error && !inline && <div className="cmsSaveError" role="alert">{error.message}</div>}
      <div className="cmsSaveButtons">
        <button type="button" className="modalCancelBtn" disabled={!dirty || saving} onClick={onDiscard}>Discard changes</button>
        <button type="button" className="btnApproveAction" disabled={!dirty || saving} onClick={onSave}>{saving ? "Saving..." : saveLabel}</button>
      </div>
    </div>
  );
}

// ---------------- Schema-aware form for CMS block content ----------------
const humanize = (key: string) =>
  key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());

// Technical styling values the website needs but a client should never have to edit. They are kept as stored.
const HIDDEN_KEYS = new Set(["variant", "tone", "icon"]);
const URL_KEYS = new Set(["href"]);
const IMAGE_KEYS = new Set(["bgImage", "image", "mapImage"]);
const LONG_KEYS = new Set(["body", "desc", "subtitle", "message"]);

const FIELD_LABELS: Record<string, { label: string; help?: string }> = {
  eyebrow: { label: "Small heading above the title", help: "Short line shown just above the main heading." },
  subtitle: { label: "Subtitle" },
  bgImage: { label: "Background image", help: "Picture behind this section." },
  mapImage: { label: "Map image" },
  submitLabel: { label: "Search button text" },
  jobTypeLabel: { label: "“Job type” field name" },
  locationLabel: { label: "“Location” field name" },
  specialtyLabel: { label: "“Specialty” field name" },
  jobTypePlaceholder: { label: "“Job type” hint text", help: "Grey text shown before the visitor chooses." },
  locationPlaceholder: { label: "“Location” hint text", help: "Grey text shown before the visitor chooses." },
  specialtyPlaceholder: { label: "“Specialty” hint text", help: "Grey text shown before the visitor chooses." },
  urgentLabel: { label: "Text for urgent jobs" },
  referencePrefix: { label: "Reference number prefix", help: "Shown in front of each job’s reference number." },
  viewDetailsLabel: { label: "Text of the “view details” link" },
  hours: { label: "Opening hours" },
  phone: { label: "Phone number" },
  location: { label: "Address" },
  desc: { label: "Description" },
  body: { label: "Description" },
  name: { label: "Step title" },
  step: { label: "Step number" },
  num: { label: "Number" },
  value: { label: "Number or value shown" },
  title: { label: "Title" },
  search: { label: "Search box", help: "The job search shown in this section." },
  vision: { label: "Our vision" },
  mission: { label: "Our mission" },
  seeMore: { label: "“See more” link" },
  action: { label: "Button" },
  actions: { label: "Buttons" },
  items: { label: "Items" },
  cards: { label: "Cards" },
  steps: { label: "Steps" },
};

const ARRAY_NAMES: Record<string, [string, string]> = {
  "stats.items": ["Statistics", "Statistic"],
  "partners.items": ["Partners", "Partner"],
  "why-choose-us.items": ["Reasons", "Reason"],
  "hero.actions": ["Buttons", "Button"],
  "partner-with-us.cards": ["Cards", "Card"],
  "approach.steps": ["Steps", "Step"],
};

function fieldLabel(key: string, parent: string | null, blockKey: string): { label: string; help?: string } {
  if (key === "label") {
    if (parent === "seeMore") return { label: "Link text" };
    if (parent === "action" || parent === "actions") return { label: "Button text" };
    if (blockKey === "partners") return { label: "Partner name" };
    return { label: "Label" };
  }
  if (key === "href") return { label: parent === "seeMore" ? "Link address" : "Link address", help: "Where it leads: a full web address (https://…) or a page on this site such as /jobs." };
  if (key === "image") return { label: blockKey === "partners" ? "Logo image" : "Image", help: "Picture shown for this item." };
  return FIELD_LABELS[key] ?? { label: humanize(key) };
}

const urlProblem = (value: string) =>
  value && !/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(value) ? "Enter a full web address (https://…) or a page on this site starting with /." : null;

// Paths of fields with an invalid link, e.g. "actions.0.href"
export function findContentProblems(value: unknown, path: string[] = []): Array<{ path: string; message: string }> {
  if (Array.isArray(value)) return value.flatMap((v, i) => findContentProblems(v, [...path, String(i)]));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => findContentProblems(v, [...path, k]));
  const key = path[path.length - 1];
  if (typeof value === "string" && (URL_KEYS.has(key) || IMAGE_KEYS.has(key))) {
    const message = urlProblem(value);
    return message ? [{ path: path.join("."), message }] : [];
  }
  return [];
}

const blank = (v: any): any =>
  Array.isArray(v) ? [] : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, HIDDEN_KEYS.has(k) ? x : blank(x)])) : typeof v === "number" ? 0 : typeof v === "boolean" ? false : "";

const summarize = (item: any) => {
  if (item && typeof item === "object") for (const k of ["title", "name", "label", "value"]) if (typeof item[k] === "string" && item[k]) return item[k];
  return "";
};

interface NodeProps { k: string; parent: string | null; blockKey: string; path: string[]; value: any; onChange: (v: any) => void; rtl: boolean; problems: Record<string, string> }

function Leaf({ k, parent, blockKey, path, value, onChange, rtl, problems }: NodeProps) {
  const meta = fieldLabel(k, parent, blockKey);
  const err = problems[path.join(".")] ?? null;
  if (typeof value === "boolean") return <Toggle checked={value} onChange={onChange} label={meta.label} help={meta.help} />;
  if (typeof value === "number") {
    return (
      <Field label={meta.label} help={meta.help} error={err}>
        <input className="cmsInput" type="number" min={0} value={value} onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} />
      </Field>
    );
  }
  const text = value ?? "";
  const isImage = IMAGE_KEYS.has(k);
  const long = LONG_KEYS.has(k) || String(text).length > 90 || String(text).includes("\n");
  return (
    <Field label={meta.label} help={meta.help} error={err}>
      {long ? (
        <textarea className="cmsInput cmsTextarea" rows={3} dir={rtl ? "rtl" : undefined} value={text} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="cmsInput" type="text" dir={rtl && !isImage && !URL_KEYS.has(k) ? "rtl" : undefined} inputMode={URL_KEYS.has(k) || isImage ? "url" : undefined} placeholder={isImage ? "/images/… or https://…" : URL_KEYS.has(k) ? "/page or https://…" : undefined} value={text} onChange={(e) => onChange(e.target.value)} />
      )}
      {isImage && text && !urlProblem(text) && (
        <img className="cmsImagePreview" src={/^https?:/i.test(text) ? text : `${WEB_URL}${text}`} alt="" onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} onLoad={(e) => ((e.currentTarget as HTMLImageElement).style.display = "block")} />
      )}
    </Field>
  );
}

function Node(props: NodeProps) {
  const { k, parent, blockKey, path, value, onChange, rtl, problems } = props;
  const { confirm } = useContentCtx();
  if (HIDDEN_KEYS.has(k)) return null;
  if (parent === "search" && k === "action") return null; // internal link target of the search form

  if (Array.isArray(value)) {
    const names = ARRAY_NAMES[`${blockKey}.${k}`] ?? [FIELD_LABELS[k]?.label ?? humanize(k), "Item"];
    const objects = value.length > 0 && value.every((v) => v && typeof v === "object");
    const template = value.length ? blank(value[0]) : null;
    const move = (i: number, d: number) => {
      const j = i + d;
      if (j < 0 || j >= value.length) return;
      const next = [...value];
      [next[i], next[j]] = [next[j], next[i]];
      onChange(next);
    };
    return (
      <section className="cmsGroup">
        <h4 className="cmsGroupTitle">{names[0]}</h4>
        {value.length === 0 && <p className="cmsFieldHelp">Nothing here yet.</p>}
        {value.map((item, i) => (
          <div className="cmsRepeatCard" key={i}>
            <div className="cmsRepeatHeader">
              <strong>{names[1]} {i + 1}{summarize(item) ? ` · ${summarize(item).slice(0, 40)}` : ""}</strong>
              <span className="cmsRepeatActions">
                <button type="button" className="cmsLinkBtn" aria-label={`Move ${names[1]} ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>↑ Up</button>
                <button type="button" className="cmsLinkBtn" aria-label={`Move ${names[1]} ${i + 1} down`} disabled={i === value.length - 1} onClick={() => move(i, 1)}>↓ Down</button>
                <button type="button" className="cmsLinkBtn cmsLinkDanger" onClick={async () => {
                  if (await confirm({ title: `Remove ${names[1].toLowerCase()} ${i + 1}?`, message: "It disappears from this section once you save. Until then you can still discard your changes.", confirmLabel: "Remove", danger: true })) onChange(value.filter((_, x) => x !== i));
                }}>Remove</button>
              </span>
            </div>
            {objects ? (
              <ObjectFields value={item} parent={k} blockKey={blockKey} path={[...path, String(i)]} onChange={(v) => onChange(value.map((x, xi) => (xi === i ? v : x)))} rtl={rtl} problems={problems} />
            ) : (
              <Leaf k={k} parent={parent} blockKey={blockKey} path={[...path, String(i)]} value={item} onChange={(v) => onChange(value.map((x, xi) => (xi === i ? v : x)))} rtl={rtl} problems={problems} />
            )}
          </div>
        ))}
        {template !== null && (
          <button type="button" className="btnReviewAction" style={{ alignSelf: "flex-start" }} onClick={() => onChange([...value, template])}>+ Add {names[1].toLowerCase()}</button>
        )}
      </section>
    );
  }
  if (value && typeof value === "object") {
    const meta = FIELD_LABELS[k] ?? { label: humanize(k) };
    return (
      <section className="cmsGroup">
        <h4 className="cmsGroupTitle">{meta.label}</h4>
        {meta.help && <p className="cmsFieldHelp">{meta.help}</p>}
        <ObjectFields value={value} parent={k} blockKey={blockKey} path={path} onChange={onChange} rtl={rtl} problems={problems} />
      </section>
    );
  }
  return <Leaf {...props} />;
}

function ObjectFields({ value, parent, blockKey, path, onChange, rtl, problems }: { value: Record<string, any>; parent: string | null; blockKey: string; path: string[]; onChange: (v: any) => void; rtl: boolean; problems: Record<string, string> }) {
  return (
    <div className="cmsFields">
      {Object.entries(value).map(([k, v]) => (
        <Node key={k} k={k} parent={parent} blockKey={blockKey} path={[...path, k]} value={v} onChange={(nv) => onChange({ ...value, [k]: nv })} rtl={rtl} problems={problems} />
      ))}
    </div>
  );
}

// Renders the structured part of a block as plain fields; `value` is edited as a copy and returned whole,
// so any stored field without a form control is preserved untouched.
export function ContentForm({ value, onChange, blockKey, rtl, showProblems }: { value: Record<string, any>; onChange: (v: Record<string, any>) => void; blockKey: string; rtl: boolean; showProblems: boolean }) {
  const problems = showProblems ? Object.fromEntries(findContentProblems(value).map((p) => [p.path, p.message])) : {};
  return <ObjectFields value={value} parent={null} blockKey={blockKey} path={[]} onChange={onChange} rtl={rtl} problems={problems} />;
}
