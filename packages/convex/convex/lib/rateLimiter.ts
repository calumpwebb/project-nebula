import { RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// Check for dev environment
const isDev = process.env.CONVEX_CLOUD_URL?.includes("localhost") ?? true;

export const rateLimiter = new RateLimiter(components.ratelimiter, {
  // Per-email signup attempts: 3/hour (relaxed in dev)
  signupPerEmail: {
    kind: "token bucket",
    rate: isDev ? 100 : 3,
    period: HOUR,
    capacity: isDev ? 100 : 3,
  },

  // Per-email verification attempts: 5 then must resend
  verificationAttempts: {
    kind: "token bucket",
    rate: 5,
    period: HOUR,
    capacity: 5,
  },

  // Global signup limit: 1000/hour
  signupGlobal: {
    kind: "token bucket",
    rate: isDev ? 10000 : 1000,
    period: HOUR,
    capacity: isDev ? 10000 : 1000,
  },

  // Global email sending: 100/hour (bill protection)
  emailSendGlobal: {
    kind: "token bucket",
    rate: isDev ? 1000 : 100,
    period: HOUR,
    capacity: isDev ? 1000 : 100,
  },

  // Per-email email sending: 5/hour
  emailSendPerAddress: {
    kind: "token bucket",
    rate: isDev ? 50 : 5,
    period: HOUR,
    capacity: isDev ? 50 : 5,
  },
});
