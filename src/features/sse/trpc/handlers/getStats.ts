import { sseService } from "../../services/sse-service";
import { createServiceContext } from "@/utils/service-utils";

const { log } = createServiceContext("SSEStatsHandler");

export const getSSEStatsHandler = async () => {
  log.info("Getting SSE statistics");

  try {
    const activeConnections = sseService.getActiveConnectionCount();

    return {
      activeConnections,
      timestamp: Date.now(),
    };
  } catch (error) {
    log.error("Failed to get SSE statistics", error);
    throw new Error("Failed to get SSE statistics");
  }
};

export const getConnectionsHandler = async () => {
  log.info("Getting active connections");

  try {
    const connections = sseService.getConnectionDetails();

    return {
      connections,
      count: connections.length,
      timestamp: Date.now(),
    };
  } catch (error) {
    log.error("Failed to get connections", error);
    throw new Error("Failed to get connections");
  }
};
