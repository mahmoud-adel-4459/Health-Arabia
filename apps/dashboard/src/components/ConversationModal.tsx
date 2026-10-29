import { useEffect, useRef, useState } from "react";
import { getConversation, sendConversationMessage } from "../api";
import { formatDateTime } from "../lib/format";

const ROLE_LABEL: Record<string, string> = { DOCTOR: "Doctor", FACILITY: "Facility", PLATFORM_ADMIN: "Platform" };

/** The three-party coordination chat as seen by the Platform Admin. Read-only once an identity release is revoked. */
export function ConversationModal({ conversationId, onClose }: { conversationId: string; onClose: () => void }) {
  const [conversation, setConversation] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const load = () =>
      getConversation(conversationId)
        .then((r) => active && (setConversation(r.conversation), setError(null)))
        .catch((e) => active && setError(e.message || "Could not load the chat."));
    load();
    const timer = setInterval(load, 3500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [conversationId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const messages: any[] = conversation?.messages ?? [];
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [messages.length]);
  const readOnly = conversation?.status === "READ_ONLY";

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const r = await sendConversationMessage(conversationId, body);
      setDraft("");
      setConversation((prev: any) => (prev ? { ...prev, messages: [...prev.messages, r.message] } : prev));
    } catch (err: any) {
      setError(err.message || "Could not send the message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modalBackdrop" role="presentation" onClick={onClose}>
      <div className="modalCard" role="dialog" aria-modal="true" aria-labelledby="chatTitle" style={{ maxWidth: 760, width: "100%", height: "80vh", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "#f8fafc", display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 id="chatTitle" style={{ margin: 0, fontSize: 16, color: "var(--navy)" }}>Coordination chat {readOnly && <span className="adminBadge adminBadge-danger" style={{ marginLeft: 8 }}>Read only</span>}</h2>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>Between the doctor, the facility's hiring team and the platform.</p>
          </div>
          <button type="button" className="secondaryButton btnCompact" onClick={onClose} aria-label="Close chat">Close</button>
        </div>
        {readOnly && <div style={{ padding: "10px 20px", background: "var(--crimson-light)", color: "var(--crimson-dark)", fontSize: 13, fontWeight: 600 }}>The identity release was revoked, so this chat is locked. Earlier messages are kept.</div>}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {error && <div className="actionErrorBanner" role="alert">{error}</div>}
          {!conversation && !error && <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}>Loading messages...</div>}
          {conversation && messages.length === 0 && <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}>No messages have been sent yet.</div>}
          {messages.map((m) => {
            const mine = m.sender?.role === "PLATFORM_ADMIN";
            return (
              <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 3 }}>
                  <strong>{m.sender?.displayName || ROLE_LABEL[m.sender?.role] || "Participant"}</strong> · {ROLE_LABEL[m.sender?.role] ?? ""} · {formatDateTime(m.createdAt)}
                </span>
                <div style={{ maxWidth: "82%", padding: "10px 14px", borderRadius: 12, background: mine ? "var(--navy)" : "#f1f5f9", color: mine ? "#fff" : "var(--text-main)", fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.body}</div>
              </div>
            );
          })}
          <div ref={end} />
        </div>
        {!readOnly && (
          <form onSubmit={send} style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", background: "#f8fafc", display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input className="queueSearchInput" style={{ flex: "1 1 220px", paddingLeft: 14 }} aria-label="Message" placeholder="Write a message to the doctor and the facility" value={draft} onChange={(e) => setDraft(e.target.value)} disabled={sending} />
            <button type="submit" className="btnApproveAction" disabled={!draft.trim() || sending} aria-busy={sending || undefined}>Send</button>
          </form>
        )}
      </div>
    </div>
  );
}
