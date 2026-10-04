import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

import { Router } from "express";
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";

const app = express();

// Basic JSON parsing
app.use(express.json());
// Allow requests from the frontend dev server (3001) and any configured APP_URL
const allowedOrigins = [
  'http://localhost:3001',
  'http://localhost:3000',
  ...(process.env.APP_URL ? [process.env.APP_URL] : []),
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));

// Development request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// API namespace
app.use("/api/v1", healthRouter);
app.use("/api/v1/auth", authRouter);

// Centralized error handling
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
