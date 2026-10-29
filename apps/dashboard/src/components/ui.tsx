import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Tone } from "../lib/format";

export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`adminBadge adminBadge-${tone}`}>{children}</span>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="pageHeaderSection pageHeaderWithActions">
      <div>
        <h1 className="pageHeaderTitle">{title}</h1>
        {subtitle && <p className="pageHeaderSubtitle">{subtitle}</p>}
      </div>
      {actions && <div className="pageHeaderActionRow">{actions}</div>}
    </div>
  );
}

export function LoadingState({ text }: { text: string }) {
  return (
    <div className="tableLoadingState" role="status">
      <div className="tableSpinner" />
      <p>{text}</p>
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="tableEmptyState">
      <h3 className="emptyStateTitle">{title}</h3>
      {text && <p className="emptyStateSubtitle">{text}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="actionErrorBanner adminErrorState" role="alert">
      <span>{message}</span>
      {onRetry && <button type="button" className="secondaryButton btnCompact" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Pagination({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="tablePaginationFooter">
      <span>Page {page} of {totalPages} ({total} in total)</span>
      <div className="paginationBtnGroup">
        <button type="button" className="paginationBtn" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <button type="button" className="paginationBtn" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger";
export function Button({ variant = "secondary", compact, loading, className = "", children, disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; compact?: boolean; loading?: boolean }) {
  const cls = variant === "primary" ? "btnApproveAction" : variant === "danger" ? "btnRejectAction" : "secondaryButton";
  return (
    <button type="button" {...rest} disabled={disabled || loading} aria-busy={loading || undefined} className={`${cls} ${compact ? "btnCompact" : ""} ${className}`}>
      {children}
    </button>
  );
}

/** A confirmation dialog for consequential actions, with an optional required or optional reason. */
export function ConfirmDialog({
  title, message, confirmLabel, danger, busy, error, reasonLabel, reasonRequired, reason, onReason, onConfirm, onCancel,
}: {
  title: string; message: ReactNode; confirmLabel: string; danger?: boolean; busy?: boolean; error?: string | null;
  reasonLabel?: string; reasonRequired?: boolean; reason?: string; onReason?: (v: string) => void; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="modalBackdrop" role="presentation" onClick={onCancel}>
      <div className="modalCard" role="alertdialog" aria-modal="true" aria-labelledby="adminConfirmTitle" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <h2 className="modalTitle" id="adminConfirmTitle">{title}</h2>
        <div className="modalBodyText">{message}</div>
        {onReason && (
          <div style={{ marginTop: 14 }}>
            <label htmlFor="adminConfirmReason" style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>{reasonLabel}{reasonRequired ? " *" : " (optional)"}</label>
            <textarea id="adminConfirmReason" className="rejectionTextarea" rows={3} value={reason ?? ""} onChange={(e) => onReason(e.target.value)} disabled={busy} />
          </div>
        )}
        {error && <div className="modalErrorMessage" role="alert">{error}</div>}
        <div className="modalActionRow">
          <button type="button" className="secondaryButton" onClick={onCancel} disabled={busy} autoFocus>Cancel</button>
          <button type="button" className={danger ? "confirmRejectBtn" : "btnApproveAction"} onClick={onConfirm} disabled={busy} aria-busy={busy || undefined}>{busy ? "Working..." : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
