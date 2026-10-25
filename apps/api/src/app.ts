import cors from "cors";
import express, { type ErrorRequestHandler, Router } from "express";
import { env } from "./config/env";
import { healthRouter } from "./routes/health";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(express.json());

  const api = Router();
  api.use("/health", healthRouter);
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
