import fs from "fs";
import path from "path";
import crypto from "crypto";
import { prisma } from "./prisma";
import { env } from "../config/env";
import type { FileKind } from "../generated/prisma/client";

const PRIVATE_STORAGE_DIR = env.privateStoragePath;

function ensureStorageDirExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Save a private file to the configured private storage layer and record it in FileAsset.
 * Never exposes or returns public URLs.
 */
export async function savePrivateFile({
  buffer,
  originalName,
  mimeType,
  kind,
  ownerId,
}: {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  kind: FileKind;
  ownerId?: string | null;
}) {
  const kindSubdir = path.join(PRIVATE_STORAGE_DIR, kind.toLowerCase());
  ensureStorageDirExists(kindSubdir);

  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const uniquePrefix = crypto.randomUUID();
  const safeFilename = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, "_");
  const diskFilename = `${uniquePrefix}-${safeFilename}`;
  const diskPath = path.join(kindSubdir, diskFilename);

  fs.writeFileSync(diskPath, buffer);

  const storageKey = `private/${kind.toLowerCase()}/${diskFilename}`;

  const fileAsset = await prisma.fileAsset.create({
    data: {
      ownerId: ownerId ?? null,
      kind,
      visibility: "PRIVATE",
      storageKey,
      originalName,
      mimeType,
      sizeBytes: buffer.length,
      checksumSha256: hash,
    },
  });

  return fileAsset;
}

/**
 * Retrieve a private file from storage.
 */
export async function getPrivateFile(fileAssetId: string) {
  const asset = await prisma.fileAsset.findUnique({
    where: { id: fileAssetId },
  });

  if (!asset) {
    return null;
  }

  // Strip prefix to get relative path
  const relativePath = asset.storageKey.replace(/^private\//, "");
  const fullPath = path.join(PRIVATE_STORAGE_DIR, relativePath);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const buffer = fs.readFileSync(fullPath);
  return { asset, buffer };
}
