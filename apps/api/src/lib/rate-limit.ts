import type { Request, Response, NextFunction } from "express";

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

// In-memory sliding window store for rate limiting login attempts by client IP
const loginAttempts = new Map<string, RateLimitRecord>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10; // Max 10 attempts per 15 minutes per IP

// Periodically clean up expired records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of loginAttempts.entries()) {
    if (now > record.resetAt) {
      loginAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export function loginRateLimiter(req: Request, res: Response, next: NextFunction) {
  // Use client IP from request or x-forwarded-for
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown-ip";

  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (record.count >= MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
    res.set("Retry-After", String(retryAfterSec));
    res.status(429).json({
      status: "error",
      message: "Too many login attempts. Please try again later.",
      code: "RATE_LIMITED",
    });
    return;
  }

  record.count += 1;
  next();
}

/**
 * Reset rate limit counter upon successful authentication
 */
export function resetLoginRateLimit(req: Request) {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown-ip";
  loginAttempts.delete(ip);
}
