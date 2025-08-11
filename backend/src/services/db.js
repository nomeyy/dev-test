// services/db.js
const { Pool } = require("pg");

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "nomey-next",
  user: process.env.DB_USER || "postgres",
  password: String(process.env.DB_PASSWORD) || "BiGb.786",
  ssl:
    process.env.NODE_ENV === "production"
      ? {
          rejectUnauthorized: false,
        }
      : false,

  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create pool instance
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// Test connection function
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Database connected successfully");
    const result = await client.query("SELECT NOW()");
    console.log("Database time:", result.rows[0].now);
    client.release();
    return true;
  } catch (err) {
    console.error("❌ Database connection error:", err.message);
    return false;
  }
};

// Query function with error handling
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("Executed query", { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error("Database query error:", {
      query: text,
      params,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// Get a client from the pool (for transactions)
const getClient = async () => {
  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    console.error("Error getting client from pool:", error.message);
    throw error;
  }
};

// Transaction helper
const transaction = async (callback) => {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// Graceful shutdown
const closePool = async () => {
  try {
    await pool.end();
    console.log("Database pool has ended");
  } catch (error) {
    console.error("Error closing database pool:", error.message);
  }
};

// Handle process termination
process.on("SIGINT", closePool);
process.on("SIGTERM", closePool);

module.exports = {
  query,
  getClient,
  transaction,
  testConnection,
  closePool,
  pool,
};
