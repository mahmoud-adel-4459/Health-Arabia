import { Router, type Request, type Response } from "express";
import { savePrivateFile, getPrivateFile } from "../lib/storage";
import type { FileKind } from "../generated/prisma/client";
import { getAuthenticatedUser } from "./auth";
import { prisma } from "../lib/prisma";

export const filesRouter = Router();

const ALLOWED_KINDS: FileKind[] = [
  "CV",
  "PROFILE_PHOTO",
  "FACILITY_LOGO",
  "CERTIFICATE",
  "SUPPORTING_DOCUMENT",
];

filesRouter.post("/upload-private", async (req: Request, res: Response) => {
  try {
    const { filename, mimeType, base64Data, kind } = req.body ?? {};

    if (!filename || !mimeType || !base64Data || !kind) {
      res.status(400).json({
        status: "error",
        message: "Missing required upload fields (filename, mimeType, base64Data, kind).",
        code: "INVALID_UPLOAD_PAYLOAD",
      });
      return;
    }

    if (!ALLOWED_KINDS.includes(kind as FileKind)) {
      res.status(400).json({
        status: "error",
        message: `Invalid file kind. Allowed kinds: ${ALLOWED_KINDS.join(", ")}`,
        code: "INVALID_FILE_KIND",
      });
      return;
    }

    // Strip data URL prefix if present (e.g. "data:image/png;base64,")
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    // Size limit check: Photo/Logo max 5MB, CV max 10MB
    const maxBytes = kind === "CV" ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (buffer.length > maxBytes) {
      res.status(400).json({
        status: "error",
        message: `File exceeds maximum allowed size of ${maxBytes / (1024 * 1024)}MB.`,
        code: "FILE_TOO_LARGE",
      });
      return;
    }

    const authUser = await getAuthenticatedUser(req);

    const fileAsset = await savePrivateFile({
      buffer,
      originalName: String(filename),
      mimeType: String(mimeType),
      kind: kind as FileKind,
      ownerId: authUser ? authUser.id : null,
    });

    res.status(201).json({
      status: "success",
      file: {
        id: fileAsset.id,
        originalName: fileAsset.originalName,
        mimeType: fileAsset.mimeType,
        sizeBytes: fileAsset.sizeBytes,
        kind: fileAsset.kind,
        url: `/api/files/${fileAsset.id}/download`,
      },
    });
  } catch (error) {
    console.error("Private file upload error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to securely store private file.",
    });
  }
});

async function serveFileAsset(req: Request, res: Response) {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      res.status(400).json({ status: "error", message: "Missing file id.", code: "INVALID_FILE_ID" });
      return;
    }

    const fileData = await getPrivateFile(id);

    if (!fileData) {
      res.status(404).json({
        status: "error",
        message: "File not found or access restricted.",
        code: "NOT_FOUND",
      });
      return;
    }

    const isPublicKind =
      fileData.asset.kind === "FACILITY_LOGO" ||
      fileData.asset.kind === "PROFILE_PHOTO" ||
      fileData.asset.kind === "CONTENT_IMAGE" ||
      fileData.asset.visibility === "PUBLIC";

    if (!isPublicKind) {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        res.status(401).json({
          status: "error",
          message: "Unauthorized. Authentication is required to access private documents.",
          code: "UNAUTHORIZED",
        });
        return;
      }

      if (fileData.asset.ownerId && fileData.asset.ownerId !== user.id && user.role !== "PLATFORM_ADMIN") {
        if (user.role === "FACILITY") {
          // Re-check authorization on every request:
          // Facility can download private file ONLY IF an active APPROVED release with doctor consent GRANTED exists
          const facility = await prisma.facility.findUnique({ where: { userId: user.id } });
          let hasApprovedRelease = false;
          if (facility) {
            const release = await prisma.identityRelease.findFirst({
              where: {
                status: "APPROVED",
                doctorConsentStatus: "GRANTED",
                hireRequestItem: {
                  hireRequest: { facilityId: facility.id },
                  application: {
                    OR: [
                      { submission: { cvId: fileData.asset.id } },
                      { doctor: { cvId: fileData.asset.id } },
                      { documents: { some: { fileId: fileData.asset.id } } },
                    ],
                  },
                },
              },
            });
            if (release) {
              hasApprovedRelease = true;
              // Audit log every access to revealed documents
              await prisma.auditLog.create({
                data: {
                  actorId: user.id,
                  action: "DOWNLOAD_REVEALED_CV",
                  entityType: "FileAsset",
                  entityId: fileData.asset.id,
                  metadata: {
                    facilityId: facility.id,
                    identityReleaseId: release.id,
                  },
                },
              });
            }
          }

          if (!hasApprovedRelease) {
            res.status(403).json({
              status: "error",
              message: "Forbidden. Access to candidate private documents requires platform-approved identity release with granted doctor consent.",
              code: "FORBIDDEN",
            });
            return;
          }
        } else {
          res.status(403).json({
            status: "error",
            message: "Forbidden. You do not have permission to access this document.",
            code: "FORBIDDEN",
          });
          return;
        }
      }

      if (!fileData.asset.ownerId && user.role !== "PLATFORM_ADMIN") {
        res.status(403).json({
          status: "error",
          message: "Forbidden. Unclaimed private document.",
          code: "FORBIDDEN",
        });
        return;
      }
    }

    res.setHeader("Content-Type", fileData.asset.mimeType);
    res.setHeader("Content-Length", fileData.buffer.length);
    res.setHeader(
      "Cache-Control",
      isPublicKind ? "public, max-age=3600" : "private, no-cache, no-store, must-revalidate"
    );
    res.setHeader("Content-Disposition", `inline; filename="${fileData.asset.originalName}"`);
    res.send(fileData.buffer);
  } catch (error) {
    console.error("File download error:", error);
    res.status(500).json({
      status: "error",
      message: "Error retrieving file.",
    });
  }
}

filesRouter.get("/:id/download", serveFileAsset);
filesRouter.get("/private/:id", serveFileAsset);
filesRouter.get("/:id", serveFileAsset);
