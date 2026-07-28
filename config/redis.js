import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL;
const useTls =
  process.env.REDIS_TLS === "true" || Boolean(redisUrl?.includes("upstash.io"));
const clientUrl =
  useTls && redisUrl?.startsWith("redis://")
    ? redisUrl.replace("redis://", "rediss://")
    : redisUrl;

const redisClient = createClient({
  url: clientUrl,
});

redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err);
});

export async function connectRedis() {
  if (!redisUrl) {
    console.warn("Redis URL missing. Login rate limiting will fail open.");
    return;
  }

  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log("Redis connected ✅");
    }
  } catch (error) {
    console.error("Redis connection failed. Login rate limiting will fail open.");
    console.error(error.message);
  }
}

export default redisClient;
