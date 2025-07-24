/**
 * Heartbeat configuration for SSE connections
 * Based on tRPC issue #2822: https://github.com/trpc/trpc/issues/2822
 *
 * IMPORTANT: This is CLIENT-TO-SERVER heartbeat, not server-to-server!
 * - Server sends heartbeat events to connected clients via SSE
 * - Prevents providers like Fly.io from terminating idle connections
 * - Each client receives heartbeat pings to keep their connection alive
 * - This is NOT for communication between multiple server instances
 */

export interface HeartbeatConfig {
  /**
   * Enable heartbeat mechanism
   * @default true
   */
  enabled: boolean;

  /**
   * Heartbeat interval in milliseconds
   * @default 30000 (30 seconds)
   */
  intervalMs: number;

  /**
   * Custom heartbeat message (optional)
   * @default undefined (uses SSE comment)
   */
  message?: string;
}

export const defaultHeartbeatConfig: HeartbeatConfig = {
  enabled: true,
  intervalMs: 30000, // 30 seconds - safe for most providers
};

/**
 * Get heartbeat configuration with environment overrides
 */
export function getHeartbeatConfig(): HeartbeatConfig {
  return {
    enabled: process.env.SSE_HEARTBEAT_ENABLED !== "false",
    intervalMs: parseInt(process.env.SSE_HEARTBEAT_INTERVAL_MS ?? "30000", 10),
    message: process.env.SSE_HEARTBEAT_MESSAGE,
  };
}
