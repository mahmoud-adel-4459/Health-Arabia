import { prisma } from "./prisma";
import { hashPassword } from "./security";

// Development-only fallback, used only when NODE_ENV is explicitly "development" or "test".
// Any other environment (production, staging, or NODE_ENV unset) must supply ADMIN_EMAIL and ADMIN_PASSWORD.
const MIN_PRODUCTION_PASSWORD_LENGTH = 12;
// Placeholder values shipped in .env.example or used for local development; never acceptable elsewhere.
const PLACEHOLDER_PASSWORDS = ["change-me-in-production", "AdminSecure2026!"];

// Decides which first-administrator credentials may be used for the given environment.
export function resolveAdminCredentials(vars: NodeJS.ProcessEnv): { email: string; password: string } | { error: string } {
  const local = vars.NODE_ENV === "development" || vars.NODE_ENV === "test";
  const email = vars.ADMIN_EMAIL || (local ? "admin@healtharabia.local" : null);
  const password = vars.ADMIN_PASSWORD || (local ? "AdminSecure2026!" : null);
  if (!email || !password) return { error: "ADMIN_EMAIL / ADMIN_PASSWORD are not set" };
  if (!local && PLACEHOLDER_PASSWORDS.includes(password)) return { error: "ADMIN_PASSWORD is a placeholder value" };
  if (!local && password.length < MIN_PRODUCTION_PASSWORD_LENGTH) return { error: `ADMIN_PASSWORD must be at least ${MIN_PRODUCTION_PASSWORD_LENGTH} characters outside development` };
  return { email, password };
}

export async function bootstrapPlatformAdmin(): Promise<void> {
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "PLATFORM_ADMIN" },
  });
  if (existingAdmin) return;

  const credentials = resolveAdminCredentials(process.env);
  if ("error" in credentials) {
    console.warn(`[BOOTSTRAP] No Platform Administrator exists and none was created: ${credentials.error}.`);
    return;
  }
  const adminEmail = credentials.email;
  const adminPassword = credentials.password;

  const passwordHash = await hashPassword(adminPassword);
  await prisma.user.create({
    data: {
      role: "PLATFORM_ADMIN",
      status: "APPROVED",
      email: adminEmail.trim().toLowerCase(),
      displayName: "Platform Administrator",
      passwordHash,
    },
  });
  console.log(`[BOOTSTRAP] Initial Platform Administrator created (${adminEmail})`);
}
