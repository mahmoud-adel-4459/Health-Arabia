import { publicFormRateLimiter } from "../lib/rate-limit";
import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { getAuthenticatedUser } from "./auth";

export const staffingRequestsRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/staffing-requests/meta
// Reference data for the Request Medical Staff page (GCC countries, specialties)
// ---------------------------------------------------------------------------
staffingRequestsRouter.get("/meta", async (_req: Request, res: Response) => {
  try {
    const [countries, specialties] = await Promise.all([
      prisma.country.findMany({
        where: { isActive: true, isGcc: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, nameEn: true, nameAr: true, isoCode: true },
      }),
      prisma.specialty.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
        select: { id: true, nameEn: true, nameAr: true, slug: true },
      }),
    ]);

    res.json({
      status: "success",
      countries,
      specialties,
      experienceOptions: [
        "1-3 Years",
        "3-5 Years",
        "5-8 Years",
        "8-10 Years",
        "10+ Years / Consultant",
      ],
      contractTypeOptions: [
        "Full-time / Permanent",
        "Locum / Temporary",
        "Visiting Consultant",
        "Part-time",
      ],
    });
  } catch (error) {
    console.error("Staffing requests meta error:", error);
    res.status(500).json({ status: "error", message: "Failed to load reference data." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/staffing-requests
// Submit general medical staffing inquiry matching Figma node 440:3528
// ---------------------------------------------------------------------------
staffingRequestsRouter.post("/", publicFormRateLimiter, async (req: Request, res: Response) => {
  try {
    const authUser = await getAuthenticatedUser(req);

    // If authenticated as facility, link facilityId
    let facilityId: string | null = null;
    if (authUser && authUser.role === "FACILITY") {
      const facility = await prisma.facility.findUnique({
        where: { userId: authUser.id },
        select: { id: true },
      });
      if (facility) {
        facilityId = facility.id;
      }
    }

    const {
      institutionName,
      countryId,
      cityName,
      specialtyId,
      positions,
      minExperienceYears,
      experienceRange,
      contractType,
      description,
      contactName,
      contactEmail,
      contactPhone,
    } = req.body ?? {};

    // Validation
    if (!institutionName || typeof institutionName !== "string" || !institutionName.trim()) {
      res.status(400).json({ status: "error", message: "Hospital / Institution Name is required." });
      return;
    }
    if (!cityName || typeof cityName !== "string" || !cityName.trim()) {
      res.status(400).json({ status: "error", message: "City name is required." });
      return;
    }
    if (!description || typeof description !== "string" || !description.trim()) {
      res.status(400).json({ status: "error", message: "Job description and requirements are required." });
      return;
    }
    if (!contactName || typeof contactName !== "string" || !contactName.trim()) {
      res.status(400).json({ status: "error", message: "Contact person name is required." });
      return;
    }
    if (!contactEmail || typeof contactEmail !== "string" || !contactEmail.includes("@")) {
      res.status(400).json({ status: "error", message: "A valid contact email address is required." });
      return;
    }

    const numPositions = Math.max(1, parseInt(String(positions), 10) || 1);
    const expYears = minExperienceYears ? parseInt(String(minExperienceYears), 10) : null;

    // Persist to database
    const staffingRequest = await prisma.staffingRequest.create({
      data: {
        facilityId,
        institutionName: institutionName.trim(),
        countryId: countryId ? String(countryId) : null,
        cityName: cityName.trim(),
        specialtyId: specialtyId ? String(specialtyId) : null,
        positions: numPositions,
        minExperienceYears: expYears,
        experienceRange: experienceRange ? String(experienceRange).trim() : null,
        contractType: contractType ? String(contractType).trim() : null,
        description: description.trim(),
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim().toLowerCase(),
        contactPhone: contactPhone ? String(contactPhone).trim() : null,
        status: "SUBMITTED",
      },
    });

    const referenceNumber = `SR-${staffingRequest.id.slice(0, 8).toUpperCase()}`;

    res.status(201).json({
      status: "success",
      message:
        "Your medical staffing request has been submitted successfully. Our recruitment consultants will contact you shortly.",
      id: staffingRequest.id,
      referenceNumber,
      details: {
        institutionName: staffingRequest.institutionName,
        cityName: staffingRequest.cityName,
        positions: staffingRequest.positions,
        contactEmail: staffingRequest.contactEmail,
        createdAt: staffingRequest.createdAt,
      },
    });
  } catch (error) {
    console.error("Staffing request submission error:", error);
    res.status(500).json({ status: "error", message: "Failed to submit medical staffing request." });
  }
});
