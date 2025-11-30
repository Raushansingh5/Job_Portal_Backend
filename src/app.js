import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";

import userRoutes from "./routes/userRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";

import errorHandler from "./utils/errorHandler.js";
import { sanitizeRequest } from "./middlewares/sanitizeMiddleware.js";

const app = express();

app.use(helmet());


app.use(cors({
  origin: true,
  credentials: true,
}));

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate Limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
});
app.use(globalLimiter);

// Sanitize queries/body
app.use(sanitizeRequest);

// Healthcheck
app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});


app.use("/api/users", userRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

// Global Error Handler
app.use(errorHandler);

export default app;
