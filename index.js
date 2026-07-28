import cors from "cors";
import dotenv from "dotenv";
import Express from "express";

import { connectToDatabase } from "./config/mongoConn.js";
import { connectRedis } from "./config/redis.js";
import ResponseHandler from "./utils/responseHandler.js";

import ip from "ip";
import configuration from "./config/configuration.js";

import router from "./routes/index.js";

dotenv.config();

const app = Express();

const PORT = configuration.PORT || 3000;

app.set("trust proxy", 1);
app.use(Express.json({ limit: "50mb" }));

app.use(Express.urlencoded({ limit: "50mb", extended: true }));
app.use((req, _res, next) => {
  const cookieHeader = req.headers.cookie;

  req.cookies = {};

  if (cookieHeader) {
    cookieHeader.split(";").forEach((cookie) => {
      const [name, ...valueParts] = cookie.trim().split("=");

      if (name) {
        req.cookies[name] = decodeURIComponent(valueParts.join("="));
      }
    });
  }

  next();
});

const configuredOrigins = (configuration.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set(
  configuration.env === "development"
    ? [
        ...configuredOrigins,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
      ]
    : configuredOrigins,
);

const isLocalDevOrigin = (origin) =>
  configuration.env === "development" &&
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(origin);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin) || isLocalDevOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,
};

app.use(cors(corsOptions));

app.get("/", (req, res) => {
  return ResponseHandler.sendSuccessResponse(
    res,
    null,
    "Mini CRM API",
    200,
  );
});

app.use("/api", router);

if (process.env.NODE_ENV !== "test") {
  Promise.all([connectToDatabase(), connectRedis()])
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server is running on http://${ip.address()}:${PORT} ✅`);
        console.log(`Local: http://localhost:${PORT} ✅`);
        console.log(`Allowed CORS origins: ${[...allowedOrigins].join(", ")}`);
      });
    })
    .catch((error) => {
      console.error("Server startup failed:", error.message);
      process.exit(1);
    });
}

export default app;
