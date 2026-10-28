import fs from "fs";
import path from "path";
import { prisma } from "./src/lib/prisma";
import { generateSessionToken, hashSessionToken, hashPassword } from "./src/lib/security";

const API_BASE = "http://localhost:4000/api";

function logStep(step: string) {
  console.log(`\n================================================================`);
  console.log(`[TEST] ${step}`);
  console.log(`================================================================`);
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASS: ${message}`);
}

async function createTestSession(userId: string) {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  return token;
}

async function main() {
  console.log("Starting Health Arabia End-to-End Workflow Verification...\n");

  const timestamp = Date.now();

  // 0. Ensure reference data exists
  let specialty = await prisma.specialty.findFirst();
  if (!specialty) {
    specialty = await prisma.specialty.create({
      data: {
        code: `SPEC_${timestamp}`,
        nameEn: "Cardiology",
        nameAr: "أمراض القلب",
      },
    });
  }

  let country = await prisma.country.findFirst();
  if (!country) {
    country = await prisma.country.create({
      data: {
        code: "SA",
        nameEn: "Saudi Arabia",
        nameAr: "المملكة العربية السعودية",
      },
    });
  }

  let city = await prisma.city.findFirst({ where: { countryId: country.id } });
  if (!city) {
    city = await prisma.city.create({
      data: {
        countryId: country.id,
        nameEn: "Riyadh",
        nameAr: "الرياض",
      },
    });
  }

  // 1. Setup Platform Admin
  let admin = await prisma.user.findFirst({
    where: { role: "PLATFORM_ADMIN" },
  });
  if (!admin) {
    const pwHash = await hashPassword("AdminSecret123!");
    admin = await prisma.user.create({
      data: {
        email: `admin_${timestamp}@healtharabia.com`,
        passwordHash: pwHash,
        displayName: "Platform Admin",
        role: "PLATFORM_ADMIN",
        status: "APPROVED",
      },
    });
  }
  const adminToken = await createTestSession(admin.id);

  // 2. Setup Unapproved Doctor
  const pwHash = await hashPassword("DoctorPass123!");
  const unapprovedDoctorUser = await prisma.user.create({
    data: {
      email: `unapproved_doc_${timestamp}@test.com`,
      passwordHash: pwHash,
      displayName: "Dr. Pending Doctor",
      role: "DOCTOR",
      status: "PENDING_REVIEW",
      mobileE164: `+9665${String(timestamp - 100).slice(-8)}`,
    },
  });
  const unapprovedDoctorToken = await createTestSession(unapprovedDoctorUser.id);

  // 3. Setup Approved Doctor A
  const approvedDoctorUser = await prisma.user.create({
    data: {
      email: `approved_doc_a_${timestamp}@test.com`,
      passwordHash: pwHash,
      displayName: "Dr. Tarek Cardiology",
      role: "DOCTOR",
      status: "APPROVED",
      mobileE164: `+9665${String(timestamp).slice(-8)}`,
    },
  });
  const doctorProfile = await prisma.doctorProfile.create({
    data: {
      userId: approvedDoctorUser.id,
      fullName: "Dr. Tarek Cardiology",
      primarySpecialtyId: specialty.id,
      yearsOfExperience: 9,
      jobTitle: "Consultant Interventional Cardiologist",
    },
  });
  const storageDir = path.resolve(process.cwd(), "private-storage", "cv");
  if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
  const diskFilename = `test_cv_${timestamp}.pdf`;
  fs.writeFileSync(path.join(storageDir, diskFilename), Buffer.from("%PDF-1.4 sample CV"));

  const docFile = await prisma.fileAsset.create({
    data: {
      ownerId: approvedDoctorUser.id,
      kind: "CV",
      visibility: "PRIVATE",
      originalName: "Dr_Tarek_Cardiology_CV.pdf",
      storageKey: `private/cv/${diskFilename}`,
      mimeType: "application/pdf",
      sizeBytes: 1024,
    },
  });
  await prisma.doctorProfile.update({
    where: { id: doctorProfile.id },
    data: { cvId: docFile.id },
  });
  const approvedDoctorToken = await createTestSession(approvedDoctorUser.id);

  // 4. Setup Approved Facility A
  const facilityAUser = await prisma.user.create({
    data: {
      email: `facility_a_${timestamp}@test.com`,
      passwordHash: pwHash,
      displayName: "King Fahd Specialist Hospital",
      role: "FACILITY",
      status: "APPROVED",
    },
  });
  const facilityA = await prisma.facility.create({
    data: {
      userId: facilityAUser.id,
      name: "King Fahd Specialist Hospital",
      cityId: city.id,
      countryId: country.id,
      officerName: "Dr. Ahmed Recruitment Director",
      hospitalEmail: `hr_kfsh_${timestamp}@hospital.sa`,
    },
  });
  const facilityAToken = await createTestSession(facilityAUser.id);

  // 5. Setup Other Facility B (unauthorized third-party)
  const facilityBUser = await prisma.user.create({
    data: {
      email: `facility_b_${timestamp}@test.com`,
      passwordHash: pwHash,
      displayName: "Riyadh Care Hospital",
      role: "FACILITY",
      status: "APPROVED",
    },
  });
  const facilityB = await prisma.facility.create({
    data: {
      userId: facilityBUser.id,
      name: "Riyadh Care Hospital",
      cityId: city.id,
      countryId: country.id,
      officerName: "Officer B",
      hospitalEmail: `hr_rc_${timestamp}@hospital.sa`,
    },
  });
  const facilityBToken = await createTestSession(facilityBUser.id);

  // 6. Create Published Job under Facility A
  const job = await prisma.job.create({
    data: {
      facilityId: facilityA.id,
      title: "Senior Consultant Cardiologist",
      description: "Experienced cardiologist for advanced catheterization lab.",
      specialtyId: specialty.id,
      cityId: city.id,
      countryId: country.id,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  // ===========================================================================
  // TEST 1: Unapproved doctor blocked from applying
  // ===========================================================================
  logStep("TEST 1: Unapproved doctor blocked from applying");
  const applyRes1 = await fetch(`${API_BASE}/doctor/jobs/${job.id}/apply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${unapprovedDoctorToken}`,
    },
    body: JSON.stringify({
      yearsOfExperience: 5,
      currentJobTitle: "Cardiologist",
      currentLocation: "Cairo, Egypt",
      highestDegree: "MSc Cardiology",
      graduationYear: 2015,
      medicalSchool: "Cairo University",
      preferredNoticePeriod: "1 month",
      salaryExpectation: "30000 SAR",
    }),
  });
  const applyJson1 = await applyRes1.json();
  assert(applyRes1.status === 403, `Expected status 403, got ${applyRes1.status}`);
  assert(
    applyJson1.code === "ACCOUNT_NOT_APPROVED",
    `Expected code ACCOUNT_NOT_APPROVED, got ${applyJson1.code}`
  );

  // ===========================================================================
  // TEST 2: Approved doctor applies to published job
  // ===========================================================================
  logStep("TEST 2: Approved doctor applies to published job");
  const applyRes2 = await fetch(`${API_BASE}/doctor/jobs/${job.id}/apply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${approvedDoctorToken}`,
    },
    body: JSON.stringify({
      yearsOfExperience: 9,
      currentJobTitle: "Consultant Interventional Cardiologist",
      currentLocation: "Riyadh, Saudi Arabia",
      highestDegree: "Fellowship of the Royal College",
      graduationYear: 2012,
      medicalSchool: "King Saud University",
      preferredNoticePeriod: "2 months",
      salaryExpectation: "45000 SAR",
      cvFileId: docFile.id,
    }),
  });
  const applyJson2 = await applyRes2.json();
  assert(applyRes2.status === 201, `Expected status 201, got ${applyRes2.status}`);
  assert(Boolean(applyJson2.application?.candidateCode), "Candidate code was generated");
  const candidateCode = applyJson2.application.candidateCode;
  const applicationId = applyJson2.application.id;
  console.log(`Generated candidateCode: ${candidateCode}, applicationId: ${applicationId}`);

  // ===========================================================================
  // TEST 3: Duplicate application blocked
  // ===========================================================================
  logStep("TEST 3: Duplicate application blocked for same doctor and same job");
  const applyRes3 = await fetch(`${API_BASE}/doctor/jobs/${job.id}/apply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${approvedDoctorToken}`,
    },
    body: JSON.stringify({
      yearsOfExperience: 9,
      currentJobTitle: "Consultant Interventional Cardiologist",
      currentLocation: "Riyadh",
      highestDegree: "Fellowship",
      graduationYear: 2012,
      medicalSchool: "KSU",
      preferredNoticePeriod: "1 month",
      salaryExpectation: "45000",
    }),
  });
  const applyJson3 = await applyRes3.json();
  assert(applyRes3.status === 409, `Expected status 409, got ${applyRes3.status}`);
  assert(applyJson3.code === "ALREADY_APPLIED", `Expected ALREADY_APPLIED, got ${applyJson3.code}`);

  // ===========================================================================
  // TEST 4: Facility cannot access identifying data before release
  // ===========================================================================
  logStep("TEST 4: Facility cannot access identifying data before identity release");
  const facDashRes = await fetch(`${API_BASE}/facility/dashboard`, {
    headers: { Authorization: `Bearer ${facilityAToken}` },
  });
  const facDashJson = await facDashRes.json();
  assert(facDashRes.status === 200, "Facility dashboard loaded");

  const jobGroup = facDashJson.applicantGroups.find((g: any) => g.jobId === job.id);
  assert(Boolean(jobGroup), "Job group found in facility dashboard");
  const applicantInDash = jobGroup.applicants.find((a: any) => a.applicationId === applicationId);
  assert(Boolean(applicantInDash), "Applicant found in dashboard group");
  assert(applicantInDash.candidateCode === candidateCode, "Candidate code matches anonymous code");
  assert(applicantInDash.isIdentityReleased === false, "isIdentityReleased is false");
  assert(!applicantInDash.fullName, "Anonymous list does NOT expose doctor full name");
  assert(!applicantInDash.email, "Anonymous list does NOT expose doctor email");
  assert(!applicantInDash.phone, "Anonymous list does NOT expose doctor phone");
  assert(!applicantInDash.cv, "Anonymous list does NOT expose CV");

  // Attempt direct call to revealed-profile endpoint before release
  const earlyRevealRes = await fetch(`${API_BASE}/facility/candidates/${applicationId}/revealed-profile`, {
    headers: { Authorization: `Bearer ${facilityAToken}` },
  });
  assert(earlyRevealRes.status === 403, `Revealed profile blocked with 403, got ${earlyRevealRes.status}`);

  // Attempt direct call to download CV before release
  const earlyCvRes = await fetch(`${API_BASE}/files/${docFile.id}/download`, {
    headers: { Authorization: `Bearer ${facilityAToken}` },
  });
  assert(earlyCvRes.status === 403, `Direct CV download blocked with 403, got ${earlyCvRes.status}`);

  // ===========================================================================
  // TEST 5: Facility submits Hire Request for candidate
  // ===========================================================================
  logStep("TEST 5: Facility submits hire request for candidate");
  const hireReqRes = await fetch(`${API_BASE}/facility/hire-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${facilityAToken}`,
    },
    body: JSON.stringify({
      jobId: job.id,
      applicationIds: [applicationId],
      notes: "Candidate has strong cath lab background.",
    }),
  });
  const hireReqJson = await hireReqRes.json();
  assert(hireReqRes.status === 201, `Hire request created with status 201, got ${hireReqRes.status}`);
  const hireRequestId = hireReqJson.hireRequest.id;
  const hireItem = hireReqJson.hireRequest.items[0];
  const identityReleaseId = hireItem.identityRelease.id;
  assert(Boolean(identityReleaseId), "IdentityRelease was created with hire item");
  assert(
    hireItem.identityRelease.doctorConsentStatus === "PENDING",
    "doctorConsentStatus is initially PENDING"
  );
  assert(hireItem.identityRelease.status === "PENDING", "IdentityRelease status is initially PENDING");

  // ===========================================================================
  // TEST 6: Platform approval blocked if doctor consent has not been granted
  // ===========================================================================
  logStep("TEST 6: Platform approval blocked when doctor consent is PENDING");
  const earlyApproveRes = await fetch(
    `${API_BASE}/admin/hire-requests/releases/${identityReleaseId}/approve`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ decisionNote: "Premature approval attempt" }),
    }
  );
  const earlyApproveJson = await earlyApproveRes.json();
  assert(
    earlyApproveRes.status === 400,
    `Approval blocked with 400 when consent is not granted, got ${earlyApproveRes.status}`
  );
  assert(
    earlyApproveJson.code === "CONSENT_NOT_GRANTED",
    `Expected CONSENT_NOT_GRANTED, got ${earlyApproveJson.code}`
  );

  // ===========================================================================
  // TEST 7: Consent declined blocks release
  // ===========================================================================
  logStep("TEST 7: Consent declined blocks release");
  const declineRes = await fetch(`${API_BASE}/doctor/consent/${identityReleaseId}/decline`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${approvedDoctorToken}`,
    },
    body: JSON.stringify({ reason: "Not interested in relocating currently" }),
  });
  assert(declineRes.status === 200, `Consent declined successfully, got ${declineRes.status}`);

  // Confirm platform admin cannot approve a declined release
  const approveDeclinedRes = await fetch(
    `${API_BASE}/admin/hire-requests/releases/${identityReleaseId}/approve`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ decisionNote: "Admin override attempt" }),
    }
  );
  assert(
    approveDeclinedRes.status === 400,
    `Approval strictly blocked when doctor declined, got ${approveDeclinedRes.status}`
  );

  // ===========================================================================
  // TEST 8: Consent granted plus platform approval reveals data to authorized facility
  // ===========================================================================
  logStep("TEST 8: Doctor grants consent, platform approves release");
  // Grant consent
  const grantRes = await fetch(`${API_BASE}/doctor/consent/${identityReleaseId}/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${approvedDoctorToken}`,
    },
  });
  assert(grantRes.status === 200, `Consent granted with 200, got ${grantRes.status}`);

  // Platform admin approves identity release
  const adminApproveRes = await fetch(
    `${API_BASE}/admin/hire-requests/releases/${identityReleaseId}/approve`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ decisionNote: "Approved after credential verification" }),
    }
  );
  const adminApproveJson = await adminApproveRes.json();
  assert(adminApproveRes.status === 200, `Release approved with 200, got ${adminApproveRes.status}`);
  assert(adminApproveJson.release.status === "APPROVED", "IdentityRelease is APPROVED");
  const conversationId = adminApproveJson.conversation.id;
  assert(Boolean(conversationId), "Conversation was automatically created");

  // Authorized Facility A accesses revealed candidate profile
  const revealedProfileRes = await fetch(
    `${API_BASE}/facility/candidates/${applicationId}/revealed-profile`,
    {
      headers: { Authorization: `Bearer ${facilityAToken}` },
    }
  );
  const revealedProfileJson = await revealedProfileRes.json();
  assert(revealedProfileRes.status === 200, "Authorized facility retrieved revealed profile");
  assert(
    revealedProfileJson.revealedProfile.fullName === "Dr. Tarek Cardiology",
    `Doctor name revealed correctly: ${revealedProfileJson.revealedProfile.fullName}`
  );
  assert(
    Boolean(revealedProfileJson.revealedProfile.cv?.downloadUrl),
    "Verified CV download URL provided"
  );

  // Authorized Facility A downloads CV
  const cvDownloadRes = await fetch(`${API_BASE}/files/${docFile.id}/download`, {
    headers: { Authorization: `Bearer ${facilityAToken}` },
  });
  assert(cvDownloadRes.status === 200, "Authorized facility successfully accessed candidate CV");

  // Verify AuditLog entries were written
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      action: { in: ["VIEW_REVEALED_IDENTITY", "DOWNLOAD_REVEALED_CV"] },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  assert(auditLogs.length >= 2, `Audit logs recorded for reveal and CV access (found ${auditLogs.length})`);
  console.log(`Verified AuditLog actions: ${auditLogs.map((l) => l.action).join(", ")}`);

  // ===========================================================================
  // TEST 9: Unauthorized facility B and non-participants remain blocked
  // ===========================================================================
  logStep("TEST 9: Unauthorized Facility B blocked from revealed profile and CV");
  const facBRevealRes = await fetch(
    `${API_BASE}/facility/candidates/${applicationId}/revealed-profile`,
    {
      headers: { Authorization: `Bearer ${facilityBToken}` },
    }
  );
  assert(
    facBRevealRes.status === 403,
    `Unauthorized facility B blocked with 403, got ${facBRevealRes.status}`
  );

  const facBCvRes = await fetch(`${API_BASE}/files/${docFile.id}/download`, {
    headers: { Authorization: `Bearer ${facilityBToken}` },
  });
  assert(
    facBCvRes.status === 403,
    `Unauthorized facility B blocked from CV download with 403, got ${facBCvRes.status}`
  );

  // ===========================================================================
  // TEST 10: Three-party conversation verification
  // ===========================================================================
  logStep("TEST 10: Three-party conversation includes Doctor, Facility, and Platform Admin");
  const convDetailRes = await fetch(`${API_BASE}/conversations/${conversationId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const convDetailJson = await convDetailRes.json();
  assert(convDetailRes.status === 200, "Loaded conversation detail");

  const participants = convDetailJson.conversation.participants;
  assert(participants.length === 3, `Expected 3 participants, got ${participants.length}`);
  const roles = participants.map((p: any) => p.user.role).sort();
  assert(
    roles.join(",") === "DOCTOR,FACILITY,PLATFORM_ADMIN",
    `Participants contain exactly DOCTOR, FACILITY, PLATFORM_ADMIN (got: ${roles.join(",")})`
  );

  // Facility sends message
  const facMsgRes = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${facilityAToken}`,
    },
    body: JSON.stringify({ body: "Welcome Dr. Tarek, we are pleased to review your application." }),
  });
  assert(facMsgRes.status === 201, `Facility sent message with status 201, got ${facMsgRes.status}`);

  // Doctor sends message
  const docMsgRes = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${approvedDoctorToken}`,
    },
    body: JSON.stringify({ body: "Thank you Dr. Ahmed, I look forward to coordinating with your cath lab." }),
  });
  assert(docMsgRes.status === 201, `Doctor sent message with status 201, got ${docMsgRes.status}`);

  // Platform admin sends message
  const adminMsgRes = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ body: "Health Arabia coordination team is available to assist with licensing endorsement." }),
  });
  assert(adminMsgRes.status === 201, `Platform admin sent message with status 201, got ${adminMsgRes.status}`);

  // Unauthorized user (Facility B) tries to post in conversation
  const unauthorizedMsgRes = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${facilityBToken}`,
    },
    body: JSON.stringify({ body: "Intruder message" }),
  });
  assert(
    unauthorizedMsgRes.status === 403,
    `Non-participant blocked from posting with 403, got ${unauthorizedMsgRes.status}`
  );

  // Unauthorized user (Facility B) tries to read conversation
  const unauthorizedReadRes = await fetch(`${API_BASE}/conversations/${conversationId}`, {
    headers: { Authorization: `Bearer ${facilityBToken}` },
  });
  assert(
    unauthorizedReadRes.status === 403,
    `Non-participant blocked from reading conversation with 403, got ${unauthorizedReadRes.status}`
  );

  // ===========================================================================
  // TEST 11: Revocation makes conversation read-only and preserves messages
  // ===========================================================================
  logStep("TEST 11: Revocation makes conversation read-only and preserves message history");
  // Doctor revokes consent
  const revokeRes = await fetch(`${API_BASE}/doctor/consent/${identityReleaseId}/revoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${approvedDoctorToken}`,
    },
  });
  assert(revokeRes.status === 200, `Doctor revoked consent with status 200, got ${revokeRes.status}`);

  // Verify conversation status is now READ_ONLY
  const convAfterRevoke = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { messages: true },
  });
  assert(
    convAfterRevoke?.status === "READ_ONLY",
    `Conversation status is READ_ONLY (got: ${convAfterRevoke?.status})`
  );
  assert(
    (convAfterRevoke?.messages.length || 0) >= 4,
    `Message history preserved after revocation (count: ${convAfterRevoke?.messages.length})`
  );

  // Attempt to send a new message in the read-only conversation
  const postInReadOnlyRes = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${facilityAToken}`,
    },
    body: JSON.stringify({ body: "Can we still message?" }),
  });
  const postInReadOnlyJson = await postInReadOnlyRes.json();
  assert(
    postInReadOnlyRes.status === 400,
    `Sending message in revoked/read-only conversation blocked with 400, got ${postInReadOnlyRes.status}`
  );
  assert(
    postInReadOnlyJson.code === "CONVERSATION_READ_ONLY",
    `Expected CONVERSATION_READ_ONLY, got ${postInReadOnlyJson.code}`
  );

  // Facility tries to access revealed profile after revocation
  const profileAfterRevoke = await fetch(
    `${API_BASE}/facility/candidates/${applicationId}/revealed-profile`,
    {
      headers: { Authorization: `Bearer ${facilityAToken}` },
    }
  );
  assert(
    profileAfterRevoke.status === 403,
    `Revealed profile blocked after revocation with 403, got ${profileAfterRevoke.status}`
  );

  console.log("\n🎉 ALL 11 VERIFICATION TESTS PASSED WITH 100% SUCCESS!\n");
}

main()
  .catch((e) => {
    console.error("FATAL ERROR IN TEST EXECUTION:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
