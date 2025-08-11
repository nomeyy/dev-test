const express = require("express");
const sseService = require("../services/sseService");
const db = require("../services/db");
const router = express.Router();

// Middleware to validate database connection
const validateDbConnection = async (req, res, next) => {
  try {
    await db.query("SELECT 1");
    next();
  } catch (error) {
    console.error("Database connection error:", error);
    return res.status(500).json({
      success: false,
      error: "Database connection failed",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

/**
 * Send notification to specific client
 */
router.post(
  "/notify/client/:clientId",
  validateDbConnection,
  async (req, res) => {
    const { clientId } = req.params;
    const { eventType = "notification", data, userId } = req.body;

    // Validate clientId
    if (!clientId || typeof clientId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Valid clientId is required",
      });
    }

    let user = null;
    if (userId) {
      try {
        // Convert userId to number if it's a numeric string
        const userIdParam = isNaN(userId) ? userId : parseInt(userId);
        const result = await db.query('SELECT * FROM "User" WHERE id = $1', [
          userIdParam,
        ]);

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: `User with ID ${userId} not found`,
          });
        }
        user = result.rows[0];
      } catch (error) {
        console.error("Database error while fetching user:", error);
        return res.status(500).json({
          success: false,
          error: "Database error while fetching user",
          details:
            process.env.NODE_ENV === "development"
              ? error.message
              : "Internal server error",
        });
      }
    }

    try {
      const success = sseService.sendToClient(clientId, eventType, data);

      if (success) {
        res.json({
          success: true,
          message: `Event sent to client ${clientId}`,
          user,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(404).json({
          success: false,
          message: `Client ${clientId} not found or not connected`,
        });
      }
    } catch (error) {
      console.error("Error sending notification to client:", error);
      res.status(500).json({
        success: false,
        error: "Failed to send notification to client",
        details:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  },
);

/**
 * Get user by ID
 */
router.get("/user/:id", validateDbConnection, async (req, res) => {
  const userId = req.params.id;

  // Validate userId
  if (!userId) {
    return res.status(400).json({
      error: "User ID is required",
    });
  }

  try {
    // Convert userId to number if it's a numeric string
    const userIdParam = isNaN(userId) ? userId : parseInt(userId);
    const result = await db.query('SELECT * FROM "User" WHERE id = $1', [
      userIdParam,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: `User with ID ${userId} not found`,
      });
    }

    res.json({
      success: true,
      user: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Database error while fetching user:", err);
    res.status(500).json({
      error: "Database error while fetching user",
      details:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
});

/**
 * Get all users
 */
router.get("/users", validateDbConnection, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM "User" ORDER BY id');

    res.json({
      success: true,
      users: result.rows,
      count: result.rows.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Database error while fetching users:", err);
    res.status(500).json({
      error: "Database error while fetching users",
      details:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
});

/**
 * Send notification to all clients of a specific user
 */
router.post("/notify/user/:userId", validateDbConnection, async (req, res) => {
  const { userId } = req.params;
  const { eventType = "notification", data } = req.body;

  // Validate userId
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "User ID is required",
    });
  }

  let user;
  try {
    // Convert userId to number if it's a numeric string
    const userIdParam = isNaN(userId) ? userId : parseInt(userId);
    const result = await db.query('SELECT * FROM "User" WHERE id = $1', [
      userIdParam,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `User with ID ${userId} not found`,
      });
    }
    user = result.rows[0];
  } catch (error) {
    console.error("Database error while fetching user:", error);
    return res.status(500).json({
      success: false,
      error: "Database error while fetching user",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }

  try {
    const count = sseService.sendToUser(userId, eventType, data);
    res.json({
      success: true,
      message: `Event sent to ${count} clients for user ${userId}`,
      clientCount: count,
      user,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error sending notification to user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send notification to user",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

/**
 * Broadcast notification to all connected clients
 */
router.post("/notify/broadcast", (req, res) => {
  const { eventType = "broadcast", data } = req.body;

  // Validate data
  if (!data) {
    return res.status(400).json({
      success: false,
      message: "Data is required for broadcast",
    });
  }

  try {
    const count = sseService.broadcast(eventType, data);
    res.json({
      success: true,
      message: `Broadcast sent to ${count} clients`,
      clientCount: count,
      eventType,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error broadcasting notification:", error);
    res.status(500).json({
      success: false,
      error: "Failed to broadcast notification",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

/**
 * Trigger a test notification (for demo purposes)
 */
router.post("/test-notification", (req, res) => {
  const testData = {
    title: "Test Notification",
    message: "This is a test notification from the server",
    timestamp: new Date().toISOString(),
    priority: "info",
    source: "system",
  };

  try {
    const count = sseService.broadcast("test-notification", testData);
    res.json({
      success: true,
      message: `Test notification sent to ${count} clients`,
      data: testData,
      clientCount: count,
    });
  } catch (error) {
    console.error("Error sending test notification:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send test notification",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

/**
 * Clean up stale connections
 */
router.post("/cleanup", (req, res) => {
  try {
    const removedCount = sseService.cleanupStaleConnections();
    res.json({
      success: true,
      message: `Cleaned up ${removedCount} stale connections`,
      removedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error cleaning up connections:", error);
    res.status(500).json({
      success: false,
      error: "Failed to cleanup connections",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

/**
 * Health check endpoint
 */
router.get("/health", async (req, res) => {
  try {
    // Test database connection
    await db.query("SELECT 1");

    // Get SSE service stats
    const stats = sseService.getStats ? sseService.getStats() : null;

    res.json({
      success: true,
      status: "healthy",
      database: "connected",
      sse: stats || "service available",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({
      success: false,
      status: "unhealthy",
      database: "disconnected",
      error: "Health check failed",
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
