import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { modulesRouter } from "./modules";

const developmentOrigins = ["http://localhost:8082", "http://localhost:8081", "http://localhost:3000"];

function allowedOrigins() {
  const configuredOrigins = env.CLIENT_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return env.NODE_ENV === "development"
    ? Array.from(new Set([...configuredOrigins, ...developmentOrigins]))
    : configuredOrigins;
}

export function createApp() {
  const app = express();
  const corsOrigins = allowedOrigins();

  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(null, false);
      },
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use("/api", modulesRouter);
  app.use(modulesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
