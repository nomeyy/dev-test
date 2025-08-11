require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sseRoutes = require("./routes/sse");
const apiRoutes = require("./routes/api");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use("/sse", sseRoutes);
app.use("/api", apiRoutes);
// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "SSE Bootcamp Backend Server",
    endpoints: {
      sse: "/sse/connect",
      api: "/api/*",
      health: "/health",
      stats: "/sse/stats",
    },
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Server error:", error);
  res.status(500).json({
    error: "Internal server error",
    message: error.message,
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    path: req.originalUrl,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SSE Bootcamp Backend Server running on port ${PORT}`);
  console.log(`📡 SSE endpoint: http://localhost:${PORT}/sse/connect`);
  console.log(`🔗 API endpoints: http://localhost:${PORT}/api/`);
  console.log(`📊 Stats endpoint: http://localhost:${PORT}/sse/stats`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down gracefully...");
  process.exit(0);
});
