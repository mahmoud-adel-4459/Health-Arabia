import argon2 from "argon2";
import crypto from "crypto";

/**
 * Hash password using Argon2id with recommended parameters
 */
export async function hashPassword(plainText: string): Promise<string> {
  return argon2.hash(plainText, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 1,
  });
}

/**
 * Verify password against stored hash using Argon2id
 */
export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plainText);
  } catch {
    return false;
  }
}

/**
 * Generate an opaque random session token (high entropy, URL-safe base64 / hex)
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Hash session token with SHA-256 for secure database storage.
 * The raw token is stored ONLY in the client's HttpOnly cookie.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
