"use client";

import React, { useEffect, useState, useRef } from "react";
import { Send, CloseCircle, Messages1, ShieldTick, Profile2User, Hospital } from "iconsax-react";

interface Message {
  id: string;
  body: string;
  senderId: string;
  senderRole: "DOCTOR" | "FACILITY" | "PLATFORM";
  senderName: string;
  isMine: boolean;
  createdAt: string;
}

interface ConversationDetail {
  id: string;
  status: "ACTIVE" | "READ_ONLY";
  readOnlyAt: string | null;
  identityReleaseStatus: string;
  doctorConsentStatus: string;
  job: {
    id: string;
    title: string;
    ref: string;
  } | null;
  facilityName: string;
  doctorName: string;
  participants: Array<{
    userId: string;
    role: "DOCTOR" | "FACILITY" | "PLATFORM";
    name: string;
    isCurrentUser: boolean;
  }>;
  messages: Message[];
}

interface ThreePartyChatModalProps {
  conversationId: string;
  onClose: () => void;
  currentUserRole: "DOCTOR" | "FACILITY" | "PLATFORM";
}

export function ThreePartyChatModal({
  conversationId,
  onClose,
  currentUserRole,
}: ThreePartyChatModalProps) {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversation = async () => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to load conversation.");
      }
      const data = await res.json();
      setConversation(data.conversation);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to retrieve messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversation();
    const interval = setInterval(fetchConversation, 4000);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || conversation?.status === "READ_ONLY") return;

    try {
      setSending(true);
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: newMessage.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to send message.");
      }

      setNewMessage("");
      await fetchConversation();
    } catch (err: any) {
      alert(err.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "PLATFORM":
        return {
          bg: "#e8f3f3",
          color: "#1b8a8a",
          label: "Platform Coordination",
          icon: <ShieldTick size={14} color="#1b8a8a" variant="Bold" />,
        };
      case "FACILITY":
        return {
          bg: "#eff6ff",
          color: "#1d4ed8",
          label: "Healthcare Facility",
          icon: <Hospital size={14} color="#1d4ed8" variant="Bold" />,
        };
      case "DOCTOR":
      default:
        return {
          bg: "#f0fdf4",
          color: "#15803d",
          label: "Candidate Doctor",
          icon: <Profile2User size={14} color="#15803d" variant="Bold" />,
        };
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(10, 38, 71, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "760px",
          height: "85vh",
          maxHeight: "800px",
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Chat Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#ffffff",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  backgroundColor: "#e8f3f3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#1b8a8a",
                }}
              >
                <Messages1 size={20} color="#1b8a8a" variant="Bold" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0a2647" }}>
                  {conversation?.job ? conversation.job.title : "Three-Party Coordination"}
                </h3>
                <span style={{ fontSize: "12px", color: "#5b6e84" }}>
                  {conversation?.job?.ref ? `${conversation.job.ref} • ` : ""}
                  Direct coordination between Doctor, Facility, and Platform
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {conversation?.status === "READ_ONLY" ? (
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  backgroundColor: "#fee2e2",
                  color: "#991b1b",
                  padding: "4px 12px",
                  borderRadius: "20px",
                }}
              >
                Read-Only
              </span>
            ) : (
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  backgroundColor: "#ecfdf5",
                  color: "#047857",
                  padding: "4px 12px",
                  borderRadius: "20px",
                }}
              >
                ● Active Coordination
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#64748b",
                display: "flex",
              }}
            >
              <CloseCircle size={24} color="currentColor" />
            </button>
          </div>
        </div>

        {/* 3-Party Participants Bar */}
        <div
          style={{
            padding: "10px 24px",
            backgroundColor: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            fontSize: "13px",
          }}
        >
          <span style={{ color: "#5b6e84", fontWeight: 600 }}>Participants:</span>
          {conversation?.participants.map((p) => {
            const badge = getRoleBadge(p.role);
            return (
              <span
                key={p.userId}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  borderRadius: "8px",
                  backgroundColor: badge.bg,
                  color: badge.color,
                  fontWeight: 600,
                  fontSize: "12px",
                }}
              >
                {badge.icon}
                <span>
                  {p.name} {p.isCurrentUser ? "(You)" : ""}
                </span>
              </span>
            );
          })}
        </div>

        {/* Read-Only Warning Notice if Revoked */}
        {conversation?.status === "READ_ONLY" && (
          <div
            style={{
              padding: "12px 24px",
              backgroundColor: "#fff1f2",
              borderBottom: "1px solid #ffe4e6",
              color: "#be123c",
              fontSize: "13px",
              lineHeight: 1.5,
            }}
          >
            <strong>Preserved Read-Only Archive:</strong> This conversation is read-only because candidate consent or identity release was revoked, or the hire request concluded. All message history is permanently archived. New messages cannot be sent.
          </div>
        )}

        {/* Messages Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            backgroundColor: "#f8fafc",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#5b6e84" }}>
              Loading message history...
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#dc2626" }}>
              {error}
            </div>
          ) : conversation?.messages.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#5b6e84", fontSize: "14px" }}>
              No messages exchanged yet. Send a message to begin coordination.
            </div>
          ) : (
            conversation?.messages.map((msg) => {
              const badge = getRoleBadge(msg.senderRole);
              return (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: msg.isMine ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "4px",
                      fontSize: "12px",
                    }}
                  >
                    <span style={{ fontWeight: 700, color: "#0a2647" }}>{msg.senderName}</span>
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: "4px",
                        backgroundColor: badge.bg,
                        color: badge.color,
                        fontSize: "11px",
                        fontWeight: 600,
                      }}
                    >
                      {badge.label}
                    </span>
                    <span style={{ color: "#94a3b8" }}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div
                    style={{
                      maxWidth: "75%",
                      padding: "12px 18px",
                      borderRadius: msg.isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      backgroundColor: msg.isMine ? "#1b8a8a" : "#ffffff",
                      color: msg.isMine ? "#ffffff" : "#0a2647",
                      border: msg.isMine ? "none" : "1px solid #e2e8f0",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                      fontSize: "14px",
                      lineHeight: 1.5,
                      wordBreak: "break-word",
                    }}
                  >
                    {msg.body}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Footer */}
        <form
          onSubmit={handleSendMessage}
          style={{
            padding: "16px 24px",
            backgroundColor: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={conversation?.status === "READ_ONLY" || sending}
            placeholder={
              conversation?.status === "READ_ONLY"
                ? "This conversation is read-only."
                : "Type your message to Doctor, Facility, and Platform..."
            }
            style={{
              flex: 1,
              padding: "12px 18px",
              borderRadius: "12px",
              border: "1px solid #cbd5e1",
              fontSize: "14px",
              backgroundColor: conversation?.status === "READ_ONLY" ? "#f1f5f9" : "#ffffff",
            }}
          />
          <button
            type="submit"
            disabled={conversation?.status === "READ_ONLY" || sending || !newMessage.trim()}
            style={{
              padding: "12px 20px",
              borderRadius: "12px",
              backgroundColor: "#1b8a8a",
              color: "#ffffff",
              border: "none",
              cursor: conversation?.status === "READ_ONLY" || sending || !newMessage.trim() ? "not-allowed" : "pointer",
              opacity: conversation?.status === "READ_ONLY" || sending || !newMessage.trim() ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            <Send size={18} color="currentColor" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
