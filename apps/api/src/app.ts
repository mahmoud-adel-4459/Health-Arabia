import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type ErrorRequestHandler, Router } from "express";
import { env } from "./config/env";
import { authRouter } from "./routes/auth";
import { healthRouter } from "./routes/health";
import { publicAboutRouter } from "./routes/public-about";
import { publicContactRouter } from "./routes/public-contact";
import { publicCountriesRouter } from "./routes/public-countries";
import { publicFaqsRouter } from "./routes/public-faqs";
import { publicHomeRouter } from "./routes/public-home";
import { publicHospitalsRouter } from "./routes/public-hospitals";
import { publicJobsRouter } from "./routes/public-jobs";
import { publicCitiesRouter } from "./routes/public-cities";
import { adminAccountsRouter } from "./routes/admin-accounts";
import { adminFacilityChangesRouter } from "./routes/admin-facility-changes";
import { adminDoctorChangesRouter } from "./routes/admin-doctor-changes";
import { adminJobsRouter } from "./routes/admin-jobs";
import { adminHireRequestsRouter } from "./routes/admin-hire-requests";
import { conversationsRouter } from "./routes/conversations";
import { doctorRouter } from "./routes/doctor";
import { facilityRouter } from "./routes/facility";
import { accountRouter } from "./routes/account";
import { filesRouter } from "./routes/files";
import { staffingRequestsRouter } from "./routes/staffing-requests";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: "25mb" }));

  const api = Router();
  api.use("/health", healthRouter);
  api.use("/auth", authRouter);
  api.use("/files", filesRouter);
  api.use("/admin/accounts", adminAccountsRouter);
  api.use("/admin/facility-changes", adminFacilityChangesRouter);
  api.use("/admin/doctor-changes", adminDoctorChangesRouter);
  api.use("/admin/jobs", adminJobsRouter);
  api.use("/admin/hire-requests", adminHireRequestsRouter);
  api.use("/conversations", conversationsRouter);
  api.use("/doctor", doctorRouter);
  api.use("/facility", facilityRouter);
  api.use("/account", accountRouter);
  api.use("/staffing-requests", staffingRequestsRouter);
  api.use("/public/staffing-requests", staffingRequestsRouter);
  api.use("/public/home", publicHomeRouter);
  api.use("/public/about", publicAboutRouter);
  api.use("/public/countries", publicCountriesRouter);
  api.use("/public/cities", publicCitiesRouter);
  api.use("/public/hospitals", publicHospitalsRouter);
  api.use("/public/faqs", publicFaqsRouter);
  api.use("/public/contact", publicContactRouter);
  api.use("/public/jobs", publicJobsRouter);
  app.use("/api", api);

  app.use((_req, res) => {
    res.status(404).json({ status: "error", message: "Not found" });
  });

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  };
  app.use(errorHandler);

  return app;
}
