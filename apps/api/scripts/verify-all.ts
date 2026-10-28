import { prisma } from "../src/lib/prisma";

async function runVerification() {
  console.log("=== STARTING END-TO-END VERIFICATION ===");
  const baseUrl = "http://localhost:4000";

  // Helper to make fetch with cookies
  function makeSession() {
    let cookie = "";
    return {
      getCookie: () => cookie,
      fetch: async (url: string, init: RequestInit = {}) => {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...(init.headers as Record<string, string> || {}),
        };
        if (cookie) {
          headers["Cookie"] = cookie;
        }
        const res = await fetch(`${baseUrl}${url}`, {
          ...init,
          headers,
        });
        const setCookie = res.headers.get("set-cookie");
        if (setCookie) {
          // Extract ha_session cookie value
          const match = setCookie.match(/ha_session=[^;]+/);
          if (match) {
            cookie = match[0];
          }
        }
        return res;
      },
    };
  }

  // Find a test job
  const job = await prisma.job.findFirst({
    where: { status: "PUBLISHED" },
  });
  if (!job) {
    throw new Error("No active job found for testing");
  }
  console.log(`Using active job: ${job.id} (${job.title})`);

  // 1. Signed-out visitor test
  console.log("\n--- Test 1: Signed-out visitor ---");
  const visitorSession = makeSession();
  const visitorMeRes = await visitorSession.fetch("/api/auth/me");
  console.log(`GET /api/auth/me status: ${visitorMeRes.status} (Expected: 401)`);
  if (visitorMeRes.status !== 401) throw new Error("Expected 401 for anonymous /api/auth/me");

  const visitorApplyRes = await visitorSession.fetch(`/api/doctor/jobs/${job.id}/apply`, {
    method: "POST",
    body: JSON.stringify({ coverLetter: "Test" }),
  });
  console.log(`POST /api/doctor/jobs/:id/apply status: ${visitorApplyRes.status} (Expected: 401)`);
  if (visitorApplyRes.status !== 401) throw new Error("Expected 401 for anonymous application");

  // 2. Pending doctor test
  console.log("\n--- Test 2: Signed-in Pending Doctor ---");
  const pendingSession = makeSession();
  const pendingLoginRes = await pendingSession.fetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "doctor.pending@healtharabia.com",
      password: "Password123!",
    }),
  });
  console.log(`Login pending doctor status: ${pendingLoginRes.status} (Expected: 200)`);
  if (pendingLoginRes.status !== 200) throw new Error("Failed to login pending doctor");

  const pendingMeRes = await pendingSession.fetch("/api/auth/me");
  const pendingMe = await pendingMeRes.json();
  console.log(`Pending doctor session: role=${pendingMe.user?.role}, status=${pendingMe.user?.status}`);
  if (pendingMe.user?.status !== "PENDING_REVIEW") throw new Error("Expected PENDING_REVIEW status");

  const pendingApplyRes = await pendingSession.fetch(`/api/doctor/jobs/${job.id}/apply`, {
    method: "POST",
    body: JSON.stringify({ coverLetter: "Test apply by pending doctor" }),
  });
  console.log(`POST /api/doctor/jobs/:id/apply status: ${pendingApplyRes.status} (Expected: 403)`);
  const pendingApplyJson = await pendingApplyRes.json();
  console.log(`Apply rejection error message: "${pendingApplyJson.error}"`);
  if (pendingApplyRes.status !== 403) throw new Error("Pending doctor was not forbidden from applying!");

  // 3. Facility account wrong-role test
  console.log("\n--- Test 3: Wrong Role (Facility accessing doctor endpoints) ---");
  const facilitySession = makeSession();
  const facilityLoginRes = await facilitySession.fetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "officer.zayed@healtharabia.com",
      password: "Password123!",
    }),
  });
  console.log(`Login facility status: ${facilityLoginRes.status} (Expected: 200)`);
  const facilityApplyRes = await facilitySession.fetch(`/api/doctor/jobs/${job.id}/apply`, {
    method: "POST",
    body: JSON.stringify({ coverLetter: "Facility trying to apply" }),
  });
  console.log(`Facility applying status: ${facilityApplyRes.status} (Expected: 403)`);
  if (facilityApplyRes.status !== 403) throw new Error("Facility was not forbidden from applying!");

  // 4. Approved doctor profile change request flow
  console.log("\n--- Test 4: Approved Doctor Profile & Change Request Flow ---");
  const doctorSession = makeSession();
  const doctorLoginRes = await doctorSession.fetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "doctor.sarah@healtharabia.com",
      password: "Password123!",
    }),
  });
  console.log(`Login approved doctor status: ${doctorLoginRes.status} (Expected: 200)`);
  if (doctorLoginRes.status !== 200) throw new Error("Failed to login approved doctor");

  const doctorMeRes = await doctorSession.fetch("/api/auth/me");
  const doctorMe = await doctorMeRes.json();
  console.log(`Approved doctor session: role=${doctorMe.user?.role}, status=${doctorMe.user?.status}`);
  if (doctorMe.user?.status !== "APPROVED") throw new Error("Expected APPROVED status");

  const profileResBefore = await doctorSession.fetch("/api/doctor/profile");
  const profileJsonBefore = await profileResBefore.json();
  const currentAbout = profileJsonBefore.profile.about;
  const currentPosition = profileJsonBefore.profile.currentPosition;
  console.log(`Current profile position: "${currentPosition}"`);
  console.log(`Current profile about: "${currentAbout.slice(0, 40)}..."`);

  // Submit proposed changes
  const proposedChanges = {
    step1: {
      fullName: "Dr. Sarah Al-Otaibi, MD, PhD",
      gender: "FEMALE",
      dateOfBirth: "1987-04-12",
      nationalityCountryId: profileJsonBefore.profile.nationalityCountryId || profileJsonBefore.options.countries[0]?.id,
      residenceCountryId: profileJsonBefore.profile.residenceCountryId || profileJsonBefore.options.countries[0]?.id,
      city: "Riyadh",
    },
    step2: {
      currentPosition: "Lead Pediatric Cardiothoracic Specialist",
      yearsOfExperience: 14,
      grade: "Consultant",
      about: "Updated bio: Pioneering pediatric minimally invasive surgery and clinical research across the GCC.",
      isAvailable: true,
    },
    step3: {
      preferredCountryIds: [profileJsonBefore.options.countries[0]?.id].filter(Boolean),
      specialtyIds: [profileJsonBefore.options.specialties[0]?.id].filter(Boolean),
    },
    step4: {
      educations: [
        {
          degree: "Doctor of Medicine (MD)",
          institution: "King Saud University",
          year: "2010",
        },
        {
          degree: "Master of Science in Cardiology",
          institution: "Imperial College London",
          year: "2014",
        },
      ],
    },
    step5: {
      licenses: [
        {
          licenseType: "SCFHS Consultant License",
          registrationNumber: "SCFHS-987654321",
          issuingAuthority: "Saudi Commission for Health Specialties",
          expiryDate: "2028-12-31",
        },
      ],
      experiences: [
        {
          positionTitle: "Senior Consultant",
          hospitalName: "King Faisal Specialist Hospital",
          duration: "2018 - Present",
          description: "Leading the specialized pediatric congenital heart defects program.",
        },
      ],
    },
    step6: {
      languages: [
        { language: "Arabic", proficiency: "NATIVE" },
        { language: "English", proficiency: "FLUENT" },
        { language: "French", proficiency: "INTERMEDIATE" },
      ],
    },
  };

  console.log("Submitting 6-step profile change request...");
  const changeSubmitRes = await doctorSession.fetch("/api/doctor/profile/change-requests", {
    method: "POST",
    body: JSON.stringify(proposedChanges),
  });
  console.log(`POST /api/doctor/profile/change-requests status: ${changeSubmitRes.status} (Expected: 201)`);
  const changeSubmitJson = await changeSubmitRes.json();
  const requestId = changeSubmitJson.changeRequest.id;
  console.log(`Created Change Request ID: ${requestId}, status: ${changeSubmitJson.changeRequest.status}`);

  // CRITICAL CHECK: Verify live profile is UNCHANGED
  const profileResDuring = await doctorSession.fetch("/api/doctor/profile");
  const profileJsonDuring = await profileResDuring.json();
  console.log(`Verifying live profile during pending request:`);
  console.log(`  Live position: "${profileJsonDuring.profile.currentPosition}" (Expected unchanged: "${currentPosition}")`);
  if (profileJsonDuring.profile.currentPosition !== currentPosition) {
    throw new Error("VIOLATION: Live profile was modified before admin approval!");
  }
  console.log(`  Active change request attached in profile response: status=${profileJsonDuring.activeChangeRequest?.status}`);
  if (profileJsonDuring.activeChangeRequest?.status !== "PENDING") {
    throw new Error("Expected activeChangeRequest.status to be PENDING");
  }

  // 5. Admin Review: Decline Action
  console.log("\n--- Test 5: Admin Review - Decline Action ---");
  const adminSession = makeSession();
  const adminLoginRes = await adminSession.fetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "admin@healtharabia.com",
      password: "Password123!",
    }),
  });
  console.log(`Login admin status: ${adminLoginRes.status} (Expected: 200)`);
  if (adminLoginRes.status !== 200) throw new Error("Failed to login admin");

  // Admin lists change requests
  const adminListRes = await adminSession.fetch("/api/admin/doctor-changes?status=PENDING");
  const adminListJson = await adminListRes.json();
  console.log(`Admin queue pending count: ${adminListJson.requests.length}`);
  const foundInQueue = adminListJson.requests.find((r: any) => r.id === requestId);
  if (!foundInQueue) throw new Error(`Change request ${requestId} not found in admin queue`);

  // Admin views detail comparison
  const adminDetailRes = await adminSession.fetch(`/api/admin/doctor-changes/${requestId}`);
  const adminDetailJson = await adminDetailRes.json();
  console.log(`Admin detail view comparison fields:`);
  console.log(`  Current position: "${adminDetailJson.current.currentPosition}"`);
  console.log(`  Proposed position: "${adminDetailJson.proposed.currentPosition}"`);
  console.log(`  Diff fields count: ${adminDetailJson.diffFields.length}`);

  // Admin rejects with reason
  console.log("Admin testing rejection...");
  const rejectRes = await adminSession.fetch(`/api/admin/doctor-changes/${requestId}/reject`, {
    method: "POST",
    body: JSON.stringify({
      reason: "Please provide official verification for the new Master's degree.",
    }),
  });
  console.log(`POST /api/admin/doctor-changes/:id/reject status: ${rejectRes.status} (Expected: 200)`);

  // Check audit log for rejection
  const rejectAudit = await prisma.auditLog.findFirst({
    where: {
      action: "DOCTOR_PROFILE_CHANGE_REJECTED",
      recordId: requestId,
    },
  });
  console.log(`AuditLog DOCTOR_PROFILE_CHANGE_REJECTED recorded: ${!!rejectAudit}`);
  if (!rejectAudit) throw new Error("Rejection audit log was not recorded!");

  // Check doctor sees rejected status and reason, and live profile remains unchanged
  const profileAfterReject = await (await doctorSession.fetch("/api/doctor/profile")).json();
  console.log(`Doctor profile after rejection:`);
  console.log(`  Live position: "${profileAfterReject.profile.currentPosition}" (Expected unchanged: "${currentPosition}")`);
  console.log(`  Active request status: ${profileAfterReject.activeChangeRequest?.status} (Expected: REJECTED)`);
  console.log(`  Active request rejection reason: "${profileAfterReject.activeChangeRequest?.rejectionReason}"`);
  if (profileAfterReject.profile.currentPosition !== currentPosition) {
    throw new Error("VIOLATION: Live profile was altered by rejected request!");
  }
  if (profileAfterReject.activeChangeRequest?.status !== "REJECTED") {
    throw new Error("Expected REJECTED status in doctor view");
  }

  // 6. Resubmit & Admin Approve Action
  console.log("\n--- Test 6: Resubmit & Admin Approval Action ---");
  const resubmitRes = await doctorSession.fetch("/api/doctor/profile/change-requests", {
    method: "POST",
    body: JSON.stringify(proposedChanges),
  });
  const resubmitJson = await resubmitRes.json();
  const newRequestId = resubmitJson.changeRequest.id;
  console.log(`New change request submitted: ID ${newRequestId}, status: ${resubmitJson.changeRequest.status}`);

  // Admin approves new change request
  console.log("Admin approving request...");
  const approveRes = await adminSession.fetch(`/api/admin/doctor-changes/${newRequestId}/approve`, {
    method: "POST",
    body: JSON.stringify({ reviewNotes: "All documents and credentials verified." }),
  });
  console.log(`POST /api/admin/doctor-changes/:id/approve status: ${approveRes.status} (Expected: 200)`);
  if (approveRes.status !== 200) throw new Error("Failed to approve change request");

  // Check audit log for approval
  const approveAudit = await prisma.auditLog.findFirst({
    where: {
      action: "DOCTOR_PROFILE_CHANGE_APPROVED",
      recordId: newRequestId,
    },
  });
  console.log(`AuditLog DOCTOR_PROFILE_CHANGE_APPROVED recorded: ${!!approveAudit}`);
  if (!approveAudit) throw new Error("Approval audit log was not recorded!");

  // Verify changes are now ATOMICALLY applied to live doctor profile
  const profileAfterApproval = await (await doctorSession.fetch("/api/doctor/profile")).json();
  console.log(`Doctor live profile after approval:`);
  console.log(`  Live full name: "${profileAfterApproval.profile.fullName}"`);
  console.log(`  Live position: "${profileAfterApproval.profile.currentPosition}"`);
  console.log(`  Live years of exp: ${profileAfterApproval.profile.yearsOfExperience}`);
  console.log(`  Live about: "${profileAfterApproval.profile.about.slice(0, 50)}..."`);
  console.log(`  Live educations count: ${profileAfterApproval.profile.educations.length}`);
  console.log(`  Live experiences count: ${profileAfterApproval.profile.experiences.length}`);
  console.log(`  Live languages count: ${profileAfterApproval.profile.languages.length}`);

  if (profileAfterApproval.profile.currentPosition !== "Lead Pediatric Cardiothoracic Specialist") {
    throw new Error("Proposed changes were NOT applied to live profile upon approval!");
  }
  if (profileAfterApproval.profile.yearsOfExperience !== 14) {
    throw new Error("Years of experience was NOT updated!");
  }
  if (profileAfterApproval.profile.languages.length !== 3) {
    throw new Error("Languages were NOT updated!");
  }

  console.log("\n=== ALL END-TO-END VERIFICATION CHECKS PASSED SUCCESSFULLY ===");
}

runVerification()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
