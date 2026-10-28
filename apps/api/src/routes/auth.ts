import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { generateSessionToken, hashPassword, hashSessionToken, verifyPassword } from "../lib/security";
import { loginRateLimiter, resetLoginRateLimit } from "../lib/rate-limit";

export const authRouter = Router();

export const SESSION_COOKIE_NAME = "ha_session";
const SESSION_TTL_DAYS = 14;

function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function getAuthenticatedUser(req: Request) {
  const token = req.cookies?.[SESSION_COOKIE_NAME] || req.headers.authorization?.replace(/^Bearer\s+/, "");
  if (!token || typeof token !== "string") {
    return null;
  }
  const tokenHash = hashSessionToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          doctorProfile: { select: { fullName: true, jobTitle: true } },
          facility: { select: { name: true, officerName: true } },
        },
      },
    },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return null;
  }
  const user = session.user;
  if (user.status === "REJECTED" || user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
    return null;
  }
  return user;
}

// ---------------------------------------------------------------------------
// POST /api/auth/login/doctor
// Accepts mobile number or email + password. Role must be DOCTOR.
// ---------------------------------------------------------------------------
authRouter.post("/login/doctor", loginRateLimiter, async (req: Request, res: Response) => {
  const { identifier, password } = req.body ?? {};

  if (!identifier || typeof identifier !== "string" || !password || typeof password !== "string") {
    res.status(400).json({
      status: "error",
      message: "Please enter your email or mobile number and password.",
      code: "INVALID_INPUT",
    });
    return;
  }

  const cleanIdentifier = identifier.trim();
  const isEmail = cleanIdentifier.includes("@");
  const emailQuery = isEmail ? cleanIdentifier.toLowerCase() : undefined;
  const mobileQuery = !isEmail ? cleanIdentifier : undefined;

  // Search by email or mobileE164 for DOCTOR role
  const user = await prisma.user.findFirst({
    where: {
      role: "DOCTOR",
      OR: [
        ...(emailQuery ? [{ email: emailQuery }] : []),
        ...(mobileQuery ? [{ mobileE164: mobileQuery }] : []),
      ],
    },
    include: {
      doctorProfile: {
        select: {
          fullName: true,
          jobTitle: true,
        },
      },
    },
  });

  if (!user) {
    res.status(401).json({
      status: "error",
      message: "Invalid credentials. Please verify your details and try again.",
      code: "INVALID_CREDENTIALS",
    });
    return;
  }

  // Account status check
  // - APPROVED: full access
  // - PENDING_REVIEW: permitted, access review-status experience only
  // - DRAFT: incomplete registration
  // - REJECTED, SUSPENDED, DEACTIVATED: rejected login
  if (user.status === "REJECTED" || user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
    res.status(403).json({
      status: "error",
      message: `Your account is ${user.status.toLowerCase()}. Please contact support.`,
      code: `ACCOUNT_${user.status}`,
    });
    return;
  }

  if (user.status === "DRAFT") {
    res.status(403).json({
      status: "error",
      message: "Account registration is not complete. Please finish onboarding.",
      code: "ACCOUNT_DRAFT",
    });
    return;
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    res.status(401).json({
      status: "error",
      message: "Invalid credentials. Please verify your details and try again.",
      code: "INVALID_CREDENTIALS",
    });
    return;
  }

  resetLoginRateLimit(req);

  // Create opaque session
  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
      lastUsedAt: new Date(),
    },
  });

  setSessionCookie(res, rawToken);

  res.json({
    status: "success",
    message: "Login successful.",
    user: {
      id: user.id,
      email: user.email,
      mobileE164: user.mobileE164,
      displayName: user.doctorProfile?.fullName ?? user.displayName,
      role: user.role,
      status: user.status,
      isPendingReview: user.status === "PENDING_REVIEW",
    },
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login/facility
// Accepts recruitment officer's email + password. Role must be FACILITY.
// ---------------------------------------------------------------------------
authRouter.post("/login/facility", loginRateLimiter, async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    res.status(400).json({
      status: "error",
      message: "Please enter your institutional email and password.",
      code: "INVALID_INPUT",
    });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      email: cleanEmail,
      role: "FACILITY",
    },
    include: {
      facility: {
        select: {
          name: true,
          officerName: true,
        },
      },
    },
  });

  if (!user) {
    res.status(401).json({
      status: "error",
      message: "Invalid credentials. Please verify your details and try again.",
      code: "INVALID_CREDENTIALS",
    });
    return;
  }

  if (user.status === "REJECTED" || user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
    res.status(403).json({
      status: "error",
      message: `Your institution account is ${user.status.toLowerCase()}. Please contact support.`,
      code: `ACCOUNT_${user.status}`,
    });
    return;
  }

  if (user.status === "DRAFT") {
    res.status(403).json({
      status: "error",
      message: "Facility registration is not complete. Please finish onboarding.",
      code: "ACCOUNT_DRAFT",
    });
    return;
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    res.status(401).json({
      status: "error",
      message: "Invalid credentials. Please verify your details and try again.",
      code: "INVALID_CREDENTIALS",
    });
    return;
  }

  resetLoginRateLimit(req);

  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
      lastUsedAt: new Date(),
    },
  });

  setSessionCookie(res, rawToken);

  res.json({
    status: "success",
    message: "Login successful.",
    user: {
      id: user.id,
      email: user.email,
      displayName: user.facility?.name ?? user.displayName,
      role: user.role,
      status: user.status,
      isPendingReview: user.status === "PENDING_REVIEW",
    },
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login/admin
// Accepts administrator email + password. Role must be PLATFORM_ADMIN.
// ---------------------------------------------------------------------------
authRouter.post("/login/admin", loginRateLimiter, async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    res.status(400).json({
      status: "error",
      message: "Please enter your administrator email and password.",
      code: "INVALID_INPUT",
    });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      email: cleanEmail,
      role: "PLATFORM_ADMIN",
    },
  });

  if (!user) {
    res.status(401).json({
      status: "error",
      message: "Invalid administrator credentials.",
      code: "INVALID_CREDENTIALS",
    });
    return;
  }

  if (user.status !== "APPROVED") {
    res.status(403).json({
      status: "error",
      message: `Administrator account is ${user.status.toLowerCase()}. Access denied.`,
      code: `ACCOUNT_${user.status}`,
    });
    return;
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    res.status(401).json({
      status: "error",
      message: "Invalid administrator credentials.",
      code: "INVALID_CREDENTIALS",
    });
    return;
  }

  resetLoginRateLimit(req);

  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
      lastUsedAt: new Date(),
    },
  });

  setSessionCookie(res, rawToken);

  res.json({
    status: "success",
    message: "Administrator login successful.",
    token: rawToken,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName ?? "Platform Administrator",
      role: user.role,
      status: user.status,
    },
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// Returns current authenticated user and session status
// ---------------------------------------------------------------------------
authRouter.get("/me", async (req: Request, res: Response) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME] || req.headers.authorization?.replace(/^Bearer\s+/, "");

  if (!token || typeof token !== "string") {
    res.status(401).json({ status: "error", message: "Not authenticated", user: null });
    return;
  }

  const tokenHash = hashSessionToken(token);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          doctorProfile: { select: { fullName: true, jobTitle: true } },
          facility: { select: { name: true, officerName: true } },
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    clearSessionCookie(res);
    res.status(401).json({ status: "error", message: "Session expired or revoked", user: null });
    return;
  }

  const user = session.user;

  // Reject active session if account became rejected, suspended or deactivated
  if (user.status === "REJECTED" || user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
    clearSessionCookie(res);
    res.status(403).json({
      status: "error",
      message: `Account is ${user.status.toLowerCase()}`,
      user: null,
    });
    return;
  }

  // Update lastUsedAt asynchronously
  prisma.session
    .update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  const displayName =
    user.role === "DOCTOR"
      ? (user.doctorProfile?.fullName ?? user.displayName)
      : user.role === "FACILITY"
      ? (user.facility?.name ?? user.displayName)
      : (user.displayName ?? "Platform Administrator");

  res.json({
    status: "success",
    user: {
      id: user.id,
      email: user.email,
      mobileE164: user.mobileE164,
      displayName,
      role: user.role,
      status: user.status,
      isPendingReview: user.status === "PENDING_REVIEW",
    },
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// Revokes current session and clears session cookie
// ---------------------------------------------------------------------------
authRouter.post("/logout", async (req: Request, res: Response) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME] || req.headers.authorization?.replace(/^Bearer\s+/, "");

  if (token && typeof token === "string") {
    const tokenHash = hashSessionToken(token);
    await prisma.session
      .updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .catch(() => {});
  }

  clearSessionCookie(res);
  res.json({ status: "success", message: "Logged out successfully" });
});

// ---------------------------------------------------------------------------
// POST /api/auth/register/doctor
// Multi-step doctor registration wizard handler
// - mobileE164 is required and unique login identifier
// - email is optional (if provided, must be unique)
// - password hashed with Argon2id
// - status set to PENDING_REVIEW
// - handles private photo, private CV, educations, licenses, experiences
// ---------------------------------------------------------------------------
authRouter.post("/register/doctor", async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      mobileE164,
      email,
      password,
      dateOfBirth,
      residenceCountry,
      photoAssetId,
      jobTitle,
      primarySpecialty,
      about,
      yearsOfExperience,
      currentPosition,
      preferredCountries,
      educations,
      licenses,
      experiences,
      cvAssetId,
    } = req.body ?? {};

    // 1. Validate required fields
    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      res.status(400).json({
        status: "error",
        message: "Full name is required as shown in passport.",
        code: "MISSING_FULL_NAME",
      });
      return;
    }

    if (!mobileE164 || typeof mobileE164 !== "string" || !mobileE164.trim()) {
      res.status(400).json({
        status: "error",
        message: "Mobile phone number is required as your primary login identifier.",
        code: "MISSING_PHONE_NUMBER",
      });
      return;
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      res.status(400).json({
        status: "error",
        message: "Password is required and must be at least 8 characters.",
        code: "INVALID_PASSWORD",
      });
      return;
    }

    // Clean and normalize
    const cleanPhone = mobileE164.trim().replace(/\s+/g, "");
    const cleanEmail = email && typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;

    // 2. Validate uniqueness of phone
    const existingUserPhone = await prisma.user.findFirst({
      where: { mobileE164: cleanPhone },
    });
    if (existingUserPhone) {
      res.status(409).json({
        status: "error",
        message: "This mobile phone number is already registered. Please sign in instead.",
        code: "PHONE_EXISTS",
      });
      return;
    }

    // 3. Validate uniqueness of email if provided
    if (cleanEmail) {
      const existingUserEmail = await prisma.user.findFirst({
        where: { email: cleanEmail },
      });
      if (existingUserEmail) {
        res.status(409).json({
          status: "error",
          message: "This email address is already registered. Please sign in instead.",
          code: "EMAIL_EXISTS",
        });
        return;
      }
    }

    // 4. Hash password with Argon2id
    const passwordHash = await hashPassword(password);

    // 5. Lookup reference Country for residence if provided
    let residenceCountryId: string | null = null;
    if (residenceCountry && typeof residenceCountry === "string") {
      const countryRecord = await prisma.country.findFirst({
        where: {
          OR: [
            { slug: residenceCountry.toLowerCase().replace(/\s+/g, "-") },
            { nameEn: { equals: residenceCountry.trim(), mode: "insensitive" } },
            { isoCode: residenceCountry.trim().toUpperCase() },
          ],
        },
      });
      if (countryRecord) {
        residenceCountryId = countryRecord.id;
      }
    }

    // 6. Lookup primary Specialty if provided
    let primarySpecialtyId: string | null = null;
    if (primarySpecialty && typeof primarySpecialty === "string") {
      const specRecord = await prisma.specialty.findFirst({
        where: {
          OR: [
            { slug: primarySpecialty.toLowerCase().replace(/\s+/g, "-") },
            { nameEn: { equals: primarySpecialty.trim(), mode: "insensitive" } },
          ],
        },
      });
      if (specRecord) {
        primarySpecialtyId = specRecord.id;
      }
    }

    // 7. Parse Date of Birth if provided
    let parsedDob: Date | null = null;
    if (dateOfBirth && typeof dateOfBirth === "string") {
      const dParts = dateOfBirth.split(/[\/\-]/);
      if (dParts.length === 3) {
        if (dParts[0].length === 4) {
          parsedDob = new Date(`${dParts[0]}-${dParts[1]}-${dParts[2]}`);
        } else {
          parsedDob = new Date(`${dParts[2]}-${dParts[1]}-${dParts[0]}`);
        }
      }
    }

    // 8. Lookup preferred countries (many-to-many)
    const preferredCountryIds: string[] = [];
    if (Array.isArray(preferredCountries) && preferredCountries.length > 0) {
      for (const cName of preferredCountries) {
        if (typeof cName === "string") {
          const match = await prisma.country.findFirst({
            where: {
              OR: [
                { slug: cName.toLowerCase().replace(/\s+/g, "-") },
                { nameEn: { equals: cName.trim(), mode: "insensitive" } },
              ],
            },
          });
          if (match && !preferredCountryIds.includes(match.id)) {
            preferredCountryIds.push(match.id);
          }
        }
      }
    }

    // 9. Create User and DoctorProfile within transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create User with PENDING_REVIEW
      const newUser = await tx.user.create({
        data: {
          mobileE164: cleanPhone,
          email: cleanEmail,
          passwordHash,
          displayName: fullName.trim(),
          role: "DOCTOR",
          status: "PENDING_REVIEW",
          submittedForReviewAt: new Date(),
        },
      });

      // Link uploaded photo if provided
      if (photoAssetId && typeof photoAssetId === "string") {
        await tx.fileAsset.update({
          where: { id: photoAssetId },
          data: { ownerId: newUser.id },
        }).catch(() => {});
      }

      // Link uploaded CV if provided
      if (cvAssetId && typeof cvAssetId === "string") {
        await tx.fileAsset.update({
          where: { id: cvAssetId },
          data: { ownerId: newUser.id },
        }).catch(() => {});
      }

      // Create DoctorProfile
      const newProfile = await tx.doctorProfile.create({
        data: {
          userId: newUser.id,
          fullName: fullName.trim(),
          dateOfBirth: parsedDob && !isNaN(parsedDob.getTime()) ? parsedDob : null,
          residenceCountryId,
          primarySpecialtyId,
          jobTitle: jobTitle && typeof jobTitle === "string" ? jobTitle.trim() : null,
          about: about && typeof about === "string" ? about.trim() : null,
          yearsOfExperience: typeof yearsOfExperience === "number" ? yearsOfExperience : (yearsOfExperience ? parseInt(String(yearsOfExperience), 10) || null : null),
          currentPosition: currentPosition && typeof currentPosition === "string" ? currentPosition.trim() : null,
          photoId: photoAssetId || null,
          cvId: cvAssetId || null,
          preferredCountries: preferredCountryIds.length > 0
            ? { connect: preferredCountryIds.map((id) => ({ id })) }
            : undefined,
        },
      });

      // Create Educations
      if (Array.isArray(educations) && educations.length > 0) {
        for (let i = 0; i < educations.length; i++) {
          const edu = educations[i];
          if (edu && edu.degree && edu.institution) {
            await tx.doctorEducation.create({
              data: {
                doctorId: newProfile.id,
                degree: String(edu.degree).trim(),
                institution: String(edu.institution).trim(),
                graduationYear: edu.graduationYear ? parseInt(String(edu.graduationYear), 10) || null : null,
                isPrimary: Boolean(edu.isPrimary || i === 0),
                sortOrder: i,
              },
            });
          }
        }
      }

      // Create Licenses
      if (Array.isArray(licenses) && licenses.length > 0) {
        for (let i = 0; i < licenses.length; i++) {
          const lic = licenses[i];
          if (lic && lic.licenseType && lic.registrationNumber && lic.issuingAuthority) {
            let licExp: Date | null = null;
            if (lic.expiryDate && typeof lic.expiryDate === "string") {
              const parts = lic.expiryDate.split(/[\/\-]/);
              if (parts.length === 3) {
                licExp = parts[0].length === 4
                  ? new Date(`${parts[0]}-${parts[1]}-${parts[2]}`)
                  : new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
              }
            }
            await tx.doctorLicense.create({
              data: {
                doctorId: newProfile.id,
                licenseType: String(lic.licenseType).trim(),
                registrationNumber: String(lic.registrationNumber).trim(),
                issuingAuthority: String(lic.issuingAuthority).trim(),
                expiryDate: licExp && !isNaN(licExp.getTime()) ? licExp : null,
              },
            });
          }
        }
      }

      // Create Experiences
      if (Array.isArray(experiences) && experiences.length > 0) {
        for (let i = 0; i < experiences.length; i++) {
          const exp = experiences[i];
          if (exp && exp.organization && exp.position) {
            let expStart: Date = new Date();
            if (exp.startDate && typeof exp.startDate === "string") {
              const parts = exp.startDate.split(/[\/\-]/);
              if (parts.length === 3) {
                const parsed = parts[0].length === 4
                  ? new Date(`${parts[0]}-${parts[1]}-${parts[2]}`)
                  : new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                if (!isNaN(parsed.getTime())) expStart = parsed;
              }
            }
            let expEnd: Date | null = null;
            if (exp.endDate && typeof exp.endDate === "string") {
              const parts = exp.endDate.split(/[\/\-]/);
              if (parts.length === 3) {
                const parsed = parts[0].length === 4
                  ? new Date(`${parts[0]}-${parts[1]}-${parts[2]}`)
                  : new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                if (!isNaN(parsed.getTime())) expEnd = parsed;
              }
            }
            await tx.doctorExperience.create({
              data: {
                doctorId: newProfile.id,
                organization: String(exp.organization).trim(),
                position: String(exp.position).trim(),
                startDate: expStart,
                endDate: expEnd,
                responsibilities: exp.responsibilities ? String(exp.responsibilities).trim() : null,
                sortOrder: i,
              },
            });
          }
        }
      }

      return { user: newUser, profile: newProfile };
    });

    res.status(201).json({
      status: "success",
      message: "Doctor profile registered successfully and is now pending review.",
      user: {
        id: result.user.id,
        mobileE164: result.user.mobileE164,
        email: result.user.email,
        displayName: result.user.displayName,
        role: result.user.role,
        status: result.user.status,
      },
    });
  } catch (error) {
    console.error("Doctor registration error:", error);
    res.status(500).json({
      status: "error",
      message: "An unexpected error occurred during doctor registration. Please try again.",
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/register/facility
// Onboarding wizard for Hospital / Clinic registration
// ---------------------------------------------------------------------------
authRouter.post("/register/facility", async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      cityId,
      city,
      address,
      locationUrl,
      employeeCount,
      hospitalEmail,
      password,
      confirmPassword,
      officerName,
      officerEmail,
      officerPhone,
      officerPhoneCountryCode,
      organizationType,
      message,
      logoAssetId,
    } = req.body ?? {};

    // 1. Validate required fields
    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({
        status: "error",
        message: "Hospital or Clinic name is required.",
        code: "MISSING_NAME",
      });
      return;
    }

    if (!officerName || typeof officerName !== "string" || !officerName.trim()) {
      res.status(400).json({
        status: "error",
        message: "Recruitment officer name is required.",
        code: "MISSING_OFFICER_NAME",
      });
      return;
    }

    // Recruitment officer's email is the facility login identifier
    const emailToUse = officerEmail || hospitalEmail;
    if (!emailToUse || typeof emailToUse !== "string" || !emailToUse.includes("@")) {
      res.status(400).json({
        status: "error",
        message: "A valid recruitment officer email is required for facility login.",
        code: "INVALID_EMAIL",
      });
      return;
    }
    const cleanEmail = emailToUse.trim().toLowerCase();

    if (!officerPhone || typeof officerPhone !== "string" || !officerPhone.trim()) {
      res.status(400).json({
        status: "error",
        message: "Recruitment officer phone number is required.",
        code: "MISSING_PHONE",
      });
      return;
    }

    // 2. Validate password
    if (!password || typeof password !== "string" || password.length < 8) {
      res.status(400).json({
        status: "error",
        message: "Password must be at least 8 characters long.",
        code: "WEAK_PASSWORD",
      });
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      res.status(400).json({
        status: "error",
        message: "Passwords do not match.",
        code: "PASSWORD_MISMATCH",
      });
      return;
    }

    // 3. Uniqueness check on officer email (login identifier)
    const existingUser = await prisma.user.findFirst({
      where: { email: cleanEmail },
    });
    if (existingUser) {
      res.status(409).json({
        status: "error",
        message: "This email address is already registered. Please log in or use a different email.",
        code: "EMAIL_ALREADY_EXISTS",
      });
      return;
    }

    // 4. Hash password with Argon2id
    const passwordHash = await hashPassword(password);

    // 5. Generate facility slug
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const slug = `${baseSlug || "facility"}-${randomSuffix}`;

    // 6. Map organization type to FacilityType enum
    const validTypes = ["GOVERNMENT", "MILITARY", "UNIVERSITY", "PRIVATE", "CLINIC", "OTHER"];
    let facilityType = null;
    if (organizationType && typeof organizationType === "string") {
      const upper = organizationType.trim().toUpperCase();
      if (validTypes.includes(upper)) {
        facilityType = upper;
      }
    }

    // 7. Parse employee count
    let parsedEmployeeCount: number | null = null;
    if (typeof employeeCount === "number") {
      parsedEmployeeCount = employeeCount;
    } else if (employeeCount && typeof employeeCount === "string") {
      const parsed = parseInt(employeeCount.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(parsed)) parsedEmployeeCount = parsed;
    }

    // 8. Institutional Hospital Email (strictly separated from recruitment officer login email)
    const cleanHospitalEmail = hospitalEmail && typeof hospitalEmail === "string" && hospitalEmail.includes("@")
      ? hospitalEmail.trim().toLowerCase()
      : null;

    // 9. Resolve managed City relation (Facility.cityId -> City.id)
    const targetCityInput = cityId || (typeof city === "string" ? city.trim() : null);
    let validCityId: string | null = null;
    let facilityCountryId: string | null = null;

    if (targetCityInput) {
      const cityRecord = await prisma.city.findFirst({
        where: {
          OR: [
            { id: targetCityInput },
            { nameEn: { equals: targetCityInput, mode: "insensitive" } },
            { nameAr: { equals: targetCityInput, mode: "insensitive" } },
          ],
        },
        select: { id: true, countryId: true },
      });
      if (cityRecord) {
        validCityId = cityRecord.id;
        facilityCountryId = cityRecord.countryId;
      }
    }

    // 10. Execute transaction: User (role: FACILITY, status: PENDING_REVIEW) + Facility
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          role: "FACILITY",
          status: "PENDING_REVIEW",
          email: cleanEmail,
          displayName: name.trim(),
          passwordHash,
          submittedForReviewAt: new Date(),
        },
      });

      // Link logo file asset if provided (keeping it PRIVATE)
      if (logoAssetId && typeof logoAssetId === "string") {
        await tx.fileAsset.update({
          where: { id: logoAssetId },
          data: { ownerId: newUser.id },
        }).catch(() => {});
      }

      const newFacility = await tx.facility.create({
        data: {
          userId: newUser.id,
          name: name.trim(),
          officerName: officerName.trim(),
          officerPhoneCountryCode: officerPhoneCountryCode ? String(officerPhoneCountryCode).trim() : null,
          officerPhone: String(officerPhone).trim(),
          type: facilityType as any,
          description: description && typeof description === "string" ? description.trim() : null,
          cityId: validCityId,
          countryId: facilityCountryId,
          address: address && typeof address === "string" ? address.trim() : null,
          locationUrl: locationUrl && typeof locationUrl === "string" ? locationUrl.trim() : null,
          employeeCount: parsedEmployeeCount,
          hospitalEmail: cleanHospitalEmail,
          inquiryMessage: message && typeof message === "string" ? message.trim() : null,
          logoId: logoAssetId && typeof logoAssetId === "string" ? logoAssetId : null,
          slug,
          isListedPublicly: false, // strictly false until platform approval
        },
      });

      return { user: newUser, facility: newFacility };
    });

    res.status(201).json({
      status: "success",
      message: "Facility registration submitted successfully and is now pending platform review.",
      facility: {
        id: result.facility.id,
        name: result.facility.name,
        officerName: result.facility.officerName,
        email: result.user.email,
        status: result.user.status,
      },
    });
  } catch (error) {
    console.error("Facility registration error:", error);
    res.status(500).json({
      status: "error",
      message: "An unexpected error occurred during facility registration. Please try again.",
    });
  }
});


