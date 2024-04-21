import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config/index.js";
import router from "./routes/index.js";

const app = express();

const corsOptions = {
  origin: config.corsOrigin || "*", // Fallback origin if CORS_ORIGIN is not set
  credentials: true, // Allow credentials (cookies) to be sent
};

// Global Middleware
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

// Default route for the root path
app.get("/", (req, res) => {
  console.log("API is working properly.");
  res.status(200).send("API is working properly.");
});

// Routing
// app.get("/api/v1", (req, res) => {
//   // Default route for the root path
//   console.log("API is working properly.");
//   res.status(200).send("API is working properly.");
// });
app.use("/api/v1", router);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

export { app };
