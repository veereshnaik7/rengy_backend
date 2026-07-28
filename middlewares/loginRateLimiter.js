import redisClient from "../config/redis.js";

const MAX_IP_ATTEMPTS = 20;
const MAX_ACCOUNT_ATTEMPTS = 3;
const WINDOW_SECONDS = 10 * 60;

async function incrementLimit(key, maximumAttempts) {
  const attempts = await redisClient.incr(key);

  if (attempts === 1) {
    await redisClient.expire(key, WINDOW_SECONDS);
  }

  const ttl = await redisClient.ttl(key);

  return {
    allowed: attempts <= maximumAttempts,
    attempts,
    remaining: Math.max(maximumAttempts - attempts, 0),
    retryAfter: Math.max(ttl, 0),
  };
}

export async function loginRateLimiter(req, res, next) {
  try {
    if (!redisClient.isOpen) {
      return next();
    }

    const ip = req.ip;

    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    // One IP trying multiple accounts
    const ipLimit = await incrementLimit(
      `rate-limit:login:ip:${ip}`,
      MAX_IP_ATTEMPTS,
    );

    if (!ipLimit.allowed) {
      res.set("Retry-After", String(ipLimit.retryAfter));
      res.set("X-RateLimit-Limit", String(MAX_IP_ATTEMPTS));
      res.set("X-RateLimit-Remaining", String(ipLimit.remaining));
      res.set(
        "X-RateLimit-Reset",
        String(Math.floor(Date.now() / 1000) + ipLimit.retryAfter),
      );

      return res.status(429).json({
        success: false,
        message: "Too many login attempts. Please try again later.",
        retryAfter: ipLimit.retryAfter,
      });
    }

    // One IP repeatedly trying one account
    if (email) {
      const accountLimit = await incrementLimit(
        `rate-limit:login:account:${email}:${ip}`,
        MAX_ACCOUNT_ATTEMPTS,
      );

      res.set("X-RateLimit-Limit", String(MAX_ACCOUNT_ATTEMPTS));
      res.set("X-RateLimit-Remaining", String(accountLimit.remaining));
      res.set(
        "X-RateLimit-Reset",
        String(Math.floor(Date.now() / 1000) + accountLimit.retryAfter),
      );

      if (!accountLimit.allowed) {
        res.set("Retry-After", String(accountLimit.retryAfter));

        return res.status(429).json({
          success: false,
          message: "Too many login attempts. Please try again later.",
          retryAfter: accountLimit.retryAfter,
        });
      }
    }

    return next();
  } catch (error) {
    console.error("Login rate limiter failed:", error);
    return next();
  }
}