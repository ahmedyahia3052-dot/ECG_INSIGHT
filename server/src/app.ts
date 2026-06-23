import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { modulesRouter } from "./modules";

export function createApp() {
  const app = express();

  app.use(
    cors({
      credentials: true,
      origin: env.CLIENT_ORIGIN,
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
