import type { Request, Response, NextFunction } from "express";

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

// In-memory fixed-window limiter keyed by client IP. req.ip honours the app's "trust proxy" setting
// (TRUST_PROXY), so a client cannot dodge the limit by sending its own X-Forwarded-For header.
// State is per process: run a shared limiter (e.g. at the proxy) if the API is scaled to several instances.
const stores: Map<string, RateLimitRecord>[] = [];

setInterval(() => {
  const now = Date.now();
  for (const store of stores) {
    for (const [key, record] of store.entries()) {
      if (now > record.resetAt) store.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

const clientKey = (req: Request) => req.ip || req.socket.remoteAddress || "unknown-ip";

export function createRateLimiter({ windowMs, max, message }: { windowMs: number; max: number; message: string }) {
  const attempts = new Map<string, RateLimitRecord>();
  stores.push(attempts);
  const middleware = (req: Request, res: Response, next: NextFunction) => {
    const ip = clientKey(req);
    const now = Date.now();
    const record = attempts.get(ip);

    if (!record || now > record.resetAt) {
      attempts.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= max) {
      res.set("Retry-After", String(Math.ceil((record.resetAt - now) / 1000)));
      res.status(429).json({ status: "error", message, code: "RATE_LIMITED" });
      return;
    }

    record.count += 1;
    next();
  };
  return { middleware, reset: (req: Request) => attempts.delete(clientKey(req)) };
}

const login = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many login attempts. Please try again later." });
export const loginRateLimiter = login.middleware;

/** Reset the login counter upon successful authentication */
export function resetLoginRateLimit(req: Request) {
  login.reset(req);
}

// Anonymous write endpoints (registration, public forms, uploads). Generous enough for real users.
export const registrationRateLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 30, message: "Too many registration attempts. Please try again later." }).middleware;
export const publicFormRateLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 30, message: "Too many submissions. Please try again later." }).middleware;
export const uploadRateLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 120, message: "Too many uploads. Please try again later." }).middleware;
