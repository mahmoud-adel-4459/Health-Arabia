import React, { useState, useEffect, useCallback } from "react";
import type { AdminHireRequest } from "../types";
import {
  getAdminHireRequests,
  approveIdentityRelease,
  rejectIdentityRelease,
  revokeIdentityRelease,
  getConversation,
  sendConversationMessage,
} from "../api";

interface HireRequestsQueuePageProps {
  onActionComplete?: (msg: string) => void;
}

export function HireRequestsQueuePage({ onActionComplete }: HireRequestsQueuePageProps) {
  const [requests, setRequests] = useState<AdminHireRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState<number>(1);
  const [meta, setMeta] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    pendingConsentCount: number;
    pendingReleaseCount: number;
  }>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    pendingConsentCount: 0,
    pendingReleaseCount: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Chat modal state
  const [activeChatConversationId, setActiveChatConversationId] = useState<string | null>(null);
  const [conversationData, setConversationData] = useState<any | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const fetchHireRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminHireRequests({
        status: statusFilter,
        page,
        limit: 10,
      });
      setRequests(res.hireRequests);
      setMeta(res.meta);
    } catch (err: any) {
      setError(err.message || "Failed to load hire requests.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchHireRequests();
  }, [fetchHireRequests]);

  // Handle Approve Identity Release
  const handleApproveRelease = async (releaseId: string) => {
    if (!window.confirm("Approve identity release? This will grant the facility access to candidate credentials and create a 3-party coordination conversation.")) {
      return;
    }
    try {
      setActionLoadingId(releaseId);
      const res = await approveIdentityRelease(releaseId, "Identity release approved by platform admin.");
      onActionComplete?.("Identity release approved successfully. 3-party chat activated.");
      await fetchHireRequests();
      if (res.conversation?.id) {
        setActiveChatConversationId(res.conversation.id);
      }
    } catch (err: any) {
      alert(err.message || "Failed to approve identity release.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Reject Identity Release
  const handleRejectRelease = async (releaseId: string) => {
    const reason = window.prompt("Enter reason for rejecting identity release:");
    if (!reason) return;
    try {
      setActionLoadingId(releaseId);
      await rejectIdentityRelease(releaseId, reason);
      onActionComplete?.("Identity release rejected.");
      await fetchHireRequests();
    } catch (err: any) {
      alert(err.message || "Failed to reject identity release.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Revoke Identity Release
  const handleRevokeRelease = async (releaseId: string) => {
    const reason = window.prompt("Enter reason for revoking identity release (this will make the conversation read-only):");
    if (!reason) return;
    try {
      setActionLoadingId(releaseId);
      await revokeIdentityRelease(releaseId, reason);
      onActionComplete?.("Identity release revoked. Associated conversation set to read-only.");
      await fetchHireRequests();
      if (activeChatConversationId) {
        // Refresh open chat
        const convRes = await getConversation(activeChatConversationId);
        setConversationData(convRes.conversation);
      }
    } catch (err: any) {
      alert(err.message || "Failed to revoke identity release.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Chat Polling
  useEffect(() => {
    if (!activeChatConversationId) {
      setConversationData(null);
      return;
    }

    let active = true;
    const loadConv = async () => {
      try {
        const res = await getConversation(activeChatConversationId);
        if (active) setConversationData(res.conversation);
      } catch (err) {
        console.error("Chat fetch error:", err);
      } finally {
        if (active) setChatLoading(false);
      }
    };

    setChatLoading(true);
    loadConv();
    const interval = setInterval(loadConv, 3500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [activeChatConversationId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChatConversationId || sendingMessage) return;

    try {
      setSendingMessage(true);
      const res = await sendConversationMessage(activeChatConversationId, messageInput.trim());
      setMessageInput("");
      setConversationData((prev: any) =>
        prev ? { ...prev, messages: [...prev.messages, res.message] } : prev
      );
    } catch (err: any) {
      alert(err.message || "Failed to post message.");
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="adminQueueView">
      {/* Header */}
      <div className="queuePageHeader">
        <div>
          <h1 className="queuePageTitle">Hiring & Identity Releases</h1>
          <p className="queuePageSubtitle">
            Review hospital candidate inquiries, monitor doctor consent, approve verified identity releases, and coordinate placement.
          </p>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: "#ffffff", padding: "18px 22px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Total Hire Requests</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#0a2647", marginTop: "4px" }}>{meta.total}</div>
        </div>
        <div style={{ background: "#ffffff", padding: "18px 22px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Doctor Consent Pending</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#d97706", marginTop: "4px" }}>{meta.pendingConsentCount}</div>
        </div>
        <div style={{ background: "#ffffff", padding: "18px 22px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Ready for Admin Release</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#16a34a", marginTop: "4px" }}>{meta.pendingReleaseCount}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {[
          { key: "ALL", label: "All Requests" },
          { key: "SUBMITTED", label: "Submitted" },
          { key: "IN_COORDINATION", label: "In Coordination" },
          { key: "COMPLETED", label: "Completed" },
          { key: "CANCELLED", label: "Cancelled" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setStatusFilter(tab.key);
              setPage(1);
            }}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid",
              borderColor: statusFilter === tab.key ? "#0a2647" : "#cbd5e1",
              backgroundColor: statusFilter === tab.key ? "#0a2647" : "#ffffff",
              color: statusFilter === tab.key ? "#ffffff" : "#475569",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main List */}
      {loading ? (
        <div style={{ padding: "48px", textAlign: "center", color: "#64748b" }}>Loading hire requests...</div>
      ) : error ? (
        <div style={{ padding: "32px", background: "#fef2f2", color: "#991b1b", borderRadius: "8px" }}>{error}</div>
      ) : requests.length === 0 ? (
        <div style={{ padding: "48px", textAlign: "center", background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", color: "#64748b" }}>
          No hire requests found for the selected filter.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {requests.map((req) => (
            <div
              key={req.id}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "16px", fontWeight: 700, color: "#0a2647" }}>{req.facility.nameEn}</span>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      ({[req.facility.city, req.facility.country].filter(Boolean).join(", ")})
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", color: "#475569", marginTop: "4px" }}>
                    Job Requisition: <strong>{req.job.title}</strong> • Requested {new Date(req.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: req.status === "COMPLETED" ? "#dcfce7" : req.status === "IN_COORDINATION" ? "#dbeafe" : "#fef3c7",
                      color: req.status === "COMPLETED" ? "#15803d" : req.status === "IN_COORDINATION" ? "#1e40af" : "#b45309",
                    }}
                  >
                    {req.status}
                  </span>
                </div>
              </div>

              {/* Candidate Items */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {req.items.map((item) => {
                  const release = item.identityRelease;
                  const consentStatus = release?.doctorConsentStatus || "PENDING";
                  const releaseStatus = release?.status || "PENDING";
                  const convId = release?.conversation?.id;

                  const canApprove = release && releaseStatus === "PENDING" && consentStatus === "GRANTED";

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        background: "#f8fafc",
                        borderRadius: "8px",
                        border: "1px solid #edf2f7",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "#0a2647", fontFamily: "monospace" }}>
                            {item.candidateCode}
                          </span>
                          <span style={{ fontSize: "12px", color: "#64748b" }}>•</span>
                          <span style={{ fontSize: "13px", color: "#334155" }}>
                            {item.specialty} ({item.yearsOfExperience} yrs exp)
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "8px", marginTop: "6px", alignItems: "center" }}>
                          {/* Consent Badge */}
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background:
                                consentStatus === "GRANTED"
                                  ? "#e6fffa"
                                  : consentStatus === "DECLINED" || consentStatus === "REVOKED"
                                  ? "#fef2f2"
                                  : "#fffbeb",
                              color:
                                consentStatus === "GRANTED"
                                  ? "#0d9488"
                                  : consentStatus === "DECLINED" || consentStatus === "REVOKED"
                                  ? "#b91c1c"
                                  : "#d97706",
                            }}
                          >
                            Doctor Consent: {consentStatus}
                          </span>

                          {/* Release Badge */}
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background:
                                releaseStatus === "APPROVED"
                                  ? "#ecfdf5"
                                  : releaseStatus === "REVOKED" || releaseStatus === "REJECTED"
                                  ? "#fef2f2"
                                  : "#f1f5f9",
                              color:
                                releaseStatus === "APPROVED"
                                  ? "#059669"
                                  : releaseStatus === "REVOKED" || releaseStatus === "REJECTED"
                                  ? "#dc2626"
                                  : "#64748b",
                            }}
                          >
                            Release: {releaseStatus}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {canApprove && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApproveRelease(release.id)}
                              disabled={actionLoadingId === release.id}
                              style={{
                                padding: "6px 14px",
                                borderRadius: "6px",
                                background: "#0d9488",
                                color: "#ffffff",
                                border: "none",
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Approve Release
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectRelease(release.id)}
                              disabled={actionLoadingId === release.id}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "6px",
                                background: "#ffffff",
                                color: "#dc2626",
                                border: "1px solid #fca5a5",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {releaseStatus === "PENDING" && consentStatus !== "GRANTED" && (
                          <span style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>
                            {consentStatus === "DECLINED" ? "Consent declined by doctor" : "Consent pending"}
                          </span>
                        )}

                        {release && releaseStatus === "APPROVED" && (
                          <>
                            {convId && (
                              <button
                                type="button"
                                onClick={() => setActiveChatConversationId(convId)}
                                style={{
                                  padding: "6px 14px",
                                  borderRadius: "6px",
                                  background: "#0a2647",
                                  color: "#ffffff",
                                  border: "none",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                Open 3-Party Chat
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRevokeRelease(release.id)}
                              disabled={actionLoadingId === release.id}
                              style={{
                                padding: "6px 10px",
                                borderRadius: "6px",
                                background: "none",
                                color: "#dc2626",
                                border: "none",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Revoke
                            </button>
                          </>
                        )}

                        {releaseStatus === "REVOKED" && convId && (
                          <button
                            type="button"
                            onClick={() => setActiveChatConversationId(convId)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "6px",
                              background: "#f1f5f9",
                              color: "#475569",
                              border: "1px solid #cbd5e1",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            View Chat History (Read-Only)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3-Party Chat Modal for Platform Admin */}
      {activeChatConversationId && (
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
          onClick={() => setActiveChatConversationId(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "760px",
              height: "80vh",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#f8fafc",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0a2647" }}>
                    3-Party Coordination Chat
                  </h3>
                  {conversationData?.status === "READ_ONLY" && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        backgroundColor: "#fee2e2",
                        color: "#991b1b",
                        padding: "2px 8px",
                        borderRadius: "4px",
                      }}
                    >
                      READ-ONLY (REVOKED)
                    </span>
                  )}
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>
                  Participants: Doctor (Candidate) • Facility Hiring Team • Platform Admin
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveChatConversationId(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            {/* Read-Only Warning */}
            {conversationData?.status === "READ_ONLY" && (
              <div
                style={{
                  padding: "10px 24px",
                  backgroundColor: "#fef2f2",
                  borderBottom: "1px solid #fecaca",
                  color: "#991b1b",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                This conversation is locked in READ-ONLY mode because identity release was revoked. Historical messages are preserved.
              </div>
            )}

            {/* Messages Body */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                backgroundColor: "#ffffff",
              }}
            >
              {chatLoading && !conversationData ? (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px" }}>Loading messages...</div>
              ) : conversationData?.messages?.length === 0 ? (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px" }}>
                  No messages exchanged yet.
                </div>
              ) : (
                conversationData?.messages?.map((msg: any) => {
                  const isPlatform = msg.sender?.role === "PLATFORM_ADMIN";
                  const isDoctor = msg.sender?.role === "DOCTOR";
                  const isFacility = msg.sender?.role === "FACILITY";

                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isPlatform ? "flex-end" : "flex-start",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#334155" }}>
                          {msg.sender?.displayName || msg.sender?.email || "Participant"}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: "4px",
                            backgroundColor: isDoctor ? "#e0f2fe" : isFacility ? "#fef3c7" : "#dcfce7",
                            color: isDoctor ? "#0369a1" : isFacility ? "#b45309" : "#15803d",
                          }}
                        >
                          {msg.sender?.role}
                        </span>
                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div
                        style={{
                          maxWidth: "80%",
                          padding: "12px 16px",
                          borderRadius: "12px",
                          backgroundColor: isPlatform ? "#0a2647" : "#f1f5f9",
                          color: isPlatform ? "#ffffff" : "#0f172a",
                          fontSize: "13px",
                          lineHeight: 1.5,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {msg.body}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Bar */}
            {conversationData?.status !== "READ_ONLY" ? (
              <form
                onSubmit={handleSendMessage}
                style={{
                  padding: "16px 24px",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  gap: "12px",
                  backgroundColor: "#f8fafc",
                }}
              >
                <input
                  type="text"
                  placeholder="Type platform coordination message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  disabled={sendingMessage}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim() || sendingMessage}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    backgroundColor: "#0a2647",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                    opacity: !messageInput.trim() || sendingMessage ? 0.6 : 1,
                  }}
                >
                  Send
                </button>
              </form>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
