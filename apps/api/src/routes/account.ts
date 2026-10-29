import { Router, type Request, type Response, type NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { getAuthenticatedUser } from "./auth";
import { hashPassword, verifyPassword } from "../lib/security";

export const accountRouter = Router();

// Middleware: Require Authenticated User
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ status: "error", message: "Authentication required.", code: "UNAUTHENTICATED" });
      return;
    }
    (req as any).currentUser = user;
    next();
  } catch (error) {
    console.error("Account auth guard error:", error);
    res.status(500).json({ status: "error", message: "Internal authentication error." });
  }
}

accountRouter.use(requireAuth);

// ---------------------------------------------------------------------------
// GET /api/account/settings
// Returns user profile settings matching Figma 564:9584
// ---------------------------------------------------------------------------
accountRouter.get("/settings", async (req: Request, res: Response) => {
  try {
    const user = (req as any).currentUser;

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        doctorProfile: { select: { fullName: true } },
        facility: {
          select: {
            officerName: true,
            officerPhone: true,
            officerPhoneCountryCode: true,
            name: true,
          },
        },
      },
    });

    if (!fullUser) {
      res.status(404).json({ status: "error", message: "User not found." });
      return;
    }

    const isFacility = fullUser.role === "FACILITY";
    const isDoctor = fullUser.role === "DOCTOR";

    const fullName = isDoctor
      ? fullUser.doctorProfile?.fullName ?? fullUser.displayName ?? ""
      : isFacility
      ? fullUser.facility?.officerName ?? fullUser.displayName ?? ""
      : fullUser.displayName ?? "Administrator";

    const mobileNumber = isDoctor
      ? fullUser.mobileE164 ?? ""
      : isFacility
      ? `${fullUser.facility?.officerPhoneCountryCode ?? ""} ${fullUser.facility?.officerPhone ?? ""}`.trim()
      : fullUser.mobileE164 ?? "";

    res.json({
      status: "success",
      settings: {
        id: fullUser.id,
        role: fullUser.role,
        fullName,
        email: fullUser.email ?? "",
        mobileNumber,
        preferredLocale: fullUser.preferredLocale,
        status: fullUser.status,
        facilityName: fullUser.facility?.name ?? null,
      },
    });
  } catch (error) {
    console.error("Get account settings error:", error);
    res.status(500).json({ status: "error", message: "Failed to load account settings." });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/account/settings
// Updates profile information or language preference
// ---------------------------------------------------------------------------
accountRouter.patch("/settings", async (req: Request, res: Response) => {
  try {
    const user = (req as any).currentUser;
    const { fullName, mobileNumber, preferredLocale } = req.body;

    const updateData: any = {};
    if (preferredLocale && (preferredLocale === "EN" || preferredLocale === "AR")) {
      updateData.preferredLocale = preferredLocale;
    }

    if (user.role === "DOCTOR") {
      if (fullName) {
        updateData.displayName = String(fullName).trim();
        await prisma.doctorProfile.updateMany({
          where: { userId: user.id },
          data: { fullName: String(fullName).trim() },
        });
      }
      if (mobileNumber) {
        updateData.mobileE164 = String(mobileNumber).trim();
      }
    } else if (user.role === "FACILITY") {
      if (fullName || mobileNumber) {
        await prisma.facility.updateMany({
          where: { userId: user.id },
          data: {
            ...(fullName ? { officerName: String(fullName).trim() } : {}),
            ...(mobileNumber ? { officerPhone: String(mobileNumber).trim() } : {}),
          },
        });
      }
      if (fullName) {
        updateData.displayName = String(fullName).trim();
      }
    } else {
      if (fullName) {
        updateData.displayName = String(fullName).trim();
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    res.json({
      status: "success",
      message: "Settings updated successfully.",
      user: {
        id: updatedUser.id,
        displayName: updatedUser.displayName,
        preferredLocale: updatedUser.preferredLocale,
      },
    });
  } catch (error) {
    console.error("Update account settings error:", error);
    res.status(500).json({ status: "error", message: "Failed to update settings." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/account/change-password
// Validates current password and updates to new password
// ---------------------------------------------------------------------------
accountRouter.post("/change-password", async (req: Request, res: Response) => {
  try {
    const user = (req as any).currentUser;
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      res.status(400).json({ status: "error", message: "All password fields are required." });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      res.status(400).json({ status: "error", message: "New password and confirmation do not match." });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ status: "error", message: "Password must be at least 8 characters long." });
      return;
    }

    // Verify current password
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!userRecord) {
      res.status(404).json({ status: "error", message: "User record not found." });
      return;
    }

    const isCurrentValid = await verifyPassword(currentPassword, userRecord.passwordHash);
    if (!isCurrentValid) {
      res.status(400).json({ status: "error", message: "Current password is incorrect." });
      return;
    }

    // Hash new password with Argon2id
    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
      },
    });

    res.json({
      status: "success",
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ status: "error", message: "Failed to change password." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/account/delete-request
// Creates an AccountDeletionRequest
// ---------------------------------------------------------------------------
accountRouter.post("/delete-request", async (req: Request, res: Response) => {
  try {
    const user = (req as any).currentUser;
    const { reason } = req.body;

    // Check if there's already an open deletion request
    const existing = await prisma.accountDeletionRequest.findFirst({
      where: {
        userId: user.id,
        status: { in: ["REQUESTED", "IN_REVIEW"] },
      },
    });

    if (existing) {
      res.status(400).json({
        status: "error",
        message: "An account deletion request is already in progress for your account.",
      });
      return;
    }

    const request = await prisma.accountDeletionRequest.create({
      data: {
        userId: user.id,
        reason: reason && typeof reason === "string" ? reason.trim() : "User requested account closure",
        status: "REQUESTED",
      },
    });

    res.status(201).json({
      status: "success",
      message: "Account deletion request submitted. Our team will review and process your request.",
      requestId: request.id,
    });
  } catch (error) {
    console.error("Account deletion request error:", error);
    res.status(500).json({ status: "error", message: "Failed to submit deletion request." });
  }
});
