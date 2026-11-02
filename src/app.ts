import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler, notFound } from "./middleware/error";
import bookingRoutes from "./routes/bookings";
import statsRoutes from "./routes/stats";
import studioRoutes from "./routes/studios";

const app = express();

const allowedOrigins = new Set([env.clientUrl, ...env.extraOrigins]);

app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || allowedOrigins.has(origin.replace(/\/+$/, ""))),
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({ name: "SD Studio API", status: "ok", docs: "/api/health" });
});
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api/studios", studioRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/stats", statsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
