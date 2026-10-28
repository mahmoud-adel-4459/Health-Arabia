import { Router, type Request, type Response, type NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { getAuthenticatedUser } from "./auth";

export const conversationsRouter = Router();

// Middleware: Require authentication
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ status: "error", message: "Authentication required.", code: "UNAUTHENTICATED" });
      return;
    }
    (req as any).authUser = user;
    next();
  } catch (error) {
    console.error("Conversation auth error:", error);
    res.status(500).json({ status: "error", message: "Internal authentication error." });
  }
}

conversationsRouter.use(requireAuth);

// ---------------------------------------------------------------------------
// GET /api/conversations
// List conversations for the authenticated user (doctor, facility, or platform admin)
// ---------------------------------------------------------------------------
conversationsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).authUser;

    const conversations = await prisma.conversation.findMany({
      where:
        user.role === "PLATFORM_ADMIN"
          ? {}
          : {
              participants: {
                some: { userId: user.id },
              },
            },
      include: {
        identityRelease: {
          include: {
            hireRequestItem: {
              include: {
                hireRequest: {
                  include: {
                    job: {
                      select: { id: true, title: true, referenceNumber: true },
                    },
                    facility: {
                      select: { id: true, name: true },
                    },
                  },
                },
                application: {
                  include: {
                    doctor: {
                      select: { id: true, fullName: true },
                    },
                  },
                },
              },
            },
          },
        },
        participants: {
          include: {
            user: { select: { id: true, displayName: true, email: true, role: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: { select: { id: true, displayName: true, role: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const list = conversations.map((c) => {
      const release = c.identityRelease;
      const job = release?.hireRequestItem?.hireRequest?.job;
      const facility = release?.hireRequestItem?.hireRequest?.facility;
      const doctor = release?.hireRequestItem?.application?.doctor;

      const myParticipant = c.participants.find((p) => p.userId === user.id);
      const lastMessage = c.messages[0] || null;

      return {
        id: c.id,
        status: c.status,
        readOnlyAt: c.readOnlyAt,
        job: job
          ? {
              id: job.id,
              title: job.title,
              ref: `JO${String(job.referenceNumber).padStart(10, "0")}`,
            }
          : null,
        facilityName: facility?.name || "Healthcare Facility",
        doctorName: doctor?.fullName || "Candidate Doctor",
        participants: c.participants.map((p) => ({
          userId: p.userId,
          role: p.role,
          name: p.user.displayName || p.user.email || p.role,
          isCurrentUser: p.userId === user.id,
        })),
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              body: lastMessage.body,
              senderId: lastMessage.senderId,
              senderRole: lastMessage.sender.role,
              senderName: lastMessage.sender.displayName || lastMessage.sender.role,
              createdAt: lastMessage.createdAt,
            }
          : null,
        myLastReadAt: myParticipant?.lastReadAt || null,
      };
    });

    res.json({
      status: "success",
      conversations: list,
    });
  } catch (error) {
    console.error("List conversations error:", error);
    res.status(500).json({ status: "error", message: "Failed to list conversations." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/conversations/:id
// Get full conversation, participants, messages, and mark read
// ---------------------------------------------------------------------------
conversationsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const user = (req as any).authUser;
    const conversationId = String(req.params.id);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        identityRelease: {
          include: {
            hireRequestItem: {
              include: {
                hireRequest: {
                  include: {
                    job: {
                      select: { id: true, title: true, referenceNumber: true },
                    },
                    facility: {
                      select: { id: true, name: true },
                    },
                  },
                },
                application: {
                  include: {
                    doctor: {
                      select: { id: true, fullName: true },
                    },
                  },
                },
              },
            },
          },
        },
        participants: {
          include: {
            user: { select: { id: true, displayName: true, email: true, role: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            sender: { select: { id: true, displayName: true, email: true, role: true } },
          },
        },
      },
    });

    if (!conversation) {
      res.status(404).json({ status: "error", message: "Conversation not found." });
      return;
    }

    // STRICT PARTICIPANT GUARD: User must be a participant or platform admin
    const isParticipant = conversation.participants.some((p) => p.userId === user.id);
    if (!isParticipant && user.role !== "PLATFORM_ADMIN") {
      res.status(403).json({
        status: "error",
        code: "FORBIDDEN",
        message: "You are not an authorized participant in this conversation.",
      });
      return;
    }

    // Mark as read for this participant
    if (isParticipant) {
      await prisma.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId: user.id,
          },
        },
        data: {
          lastReadAt: new Date(),
        },
      });
    }

    const release = conversation.identityRelease;
    const job = release?.hireRequestItem?.hireRequest?.job;
    const facility = release?.hireRequestItem?.hireRequest?.facility;
    const doctor = release?.hireRequestItem?.application?.doctor;

    res.json({
      status: "success",
      conversation: {
        id: conversation.id,
        status: conversation.status,
        readOnlyAt: conversation.readOnlyAt,
        identityReleaseStatus: release?.status,
        doctorConsentStatus: release?.doctorConsentStatus,
        job: job
          ? {
              id: job.id,
              title: job.title,
              ref: `JO${String(job.referenceNumber).padStart(10, "0")}`,
            }
          : null,
        facilityName: facility?.name || "Healthcare Facility",
        doctorName: doctor?.fullName || "Candidate Doctor",
        participants: conversation.participants.map((p) => ({
          userId: p.userId,
          role: p.role,
          name: p.user.displayName || p.user.email || p.role,
          isCurrentUser: p.userId === user.id,
          joinedAt: p.joinedAt,
        })),
        messages: conversation.messages.map((m) => ({
          id: m.id,
          body: m.body,
          senderId: m.senderId,
          senderRole: m.sender.role,
          senderName: m.sender.displayName || m.sender.role,
          isMine: m.senderId === user.id,
          createdAt: m.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Get conversation detail error:", error);
    res.status(500).json({ status: "error", message: "Failed to load conversation." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/conversations/:id/messages
// Send message in 3-party conversation
// Strictly enforces participant check, read-only gating, and release validity
// ---------------------------------------------------------------------------
conversationsRouter.post("/:id/messages", async (req: Request, res: Response) => {
  try {
    const user = (req as any).authUser;
    const conversationId = String(req.params.id);
    const { body } = req.body || {};

    if (!body || typeof body !== "string" || !body.trim()) {
      res.status(400).json({
        status: "error",
        code: "INVALID_MESSAGE",
        message: "Message body cannot be empty.",
      });
      return;
    }

    const trimmedBody = body.trim();
    if (trimmedBody.length > 5000) {
      res.status(400).json({
        status: "error",
        code: "MESSAGE_TOO_LONG",
        message: "Message exceeds maximum allowed length of 5000 characters.",
      });
      return;
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        identityRelease: true,
        participants: true,
      },
    });

    if (!conversation) {
      res.status(404).json({ status: "error", message: "Conversation not found." });
      return;
    }

    // STRICT CHECK: User must be a participant
    const isParticipant = conversation.participants.some((p) => p.userId === user.id);
    if (!isParticipant) {
      res.status(403).json({
        status: "error",
        code: "FORBIDDEN",
        message: "You must be a participant in this conversation to send messages.",
      });
      return;
    }

    // STRICT CHECK: Conversation must be ACTIVE
    if (conversation.status === "READ_ONLY") {
      res.status(403).json({
        status: "error",
        code: "CONVERSATION_READ_ONLY",
        message: "This conversation is read-only. No new messages may be sent.",
      });
      return;
    }

    // STRICT CHECK: Associated Identity Release must be APPROVED and consent GRANTED
    if (
      conversation.identityRelease.status !== "APPROVED" ||
      conversation.identityRelease.doctorConsentStatus !== "GRANTED"
    ) {
      res.status(403).json({
        status: "error",
        code: "RELEASE_NOT_ACTIVE",
        message: "Messaging requires an active, approved identity release with doctor consent.",
      });
      return;
    }

    const now = new Date();
    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderId: user.id,
          body: trimmedBody,
        },
        include: {
          sender: { select: { id: true, displayName: true, email: true, role: true } },
        },
      });

      // Update conversation timestamp
      await tx.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: now },
      });

      // Notify other participants
      const otherParticipants = conversation.participants.filter((p) => p.userId !== user.id);
      for (const p of otherParticipants) {
        await tx.notification.create({
          data: {
            userId: p.userId,
            type: "NEW_MESSAGE",
            data: {
              title: "New Message",
              body: `${user.displayName || user.role}: ${trimmedBody.slice(0, 60)}${trimmedBody.length > 60 ? "..." : ""}`,
              conversationId: conversation.id,
              messageId: msg.id,
            },
          },
        });
      }

      return msg;
    });

    res.status(201).json({
      status: "success",
      message: {
        id: message.id,
        conversationId: message.conversationId,
        body: message.body,
        senderId: message.senderId,
        senderRole: message.sender.role,
        senderName: message.sender.displayName || message.sender.role,
        isMine: true,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ status: "error", message: "Failed to send message." });
  }
});
