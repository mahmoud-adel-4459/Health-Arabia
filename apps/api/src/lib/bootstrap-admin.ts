import { prisma } from "./prisma";
import { hashPassword } from "./security";

export async function bootstrapPlatformAdmin(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || (process.env.NODE_ENV !== "production" ? "admin@healtharabia.local" : null);
  const adminPassword = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV !== "production" ? "AdminSecure2026!" : null);

  if (!adminEmail || !adminPassword) {
    return;
  }

  const existingAdmin = await prisma.user.findFirst({
    where: { role: "PLATFORM_ADMIN" },
  });

  if (!existingAdmin) {
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
}
