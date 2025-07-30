/**
 * Configuration utility functions for SSE feature
 */

import { getSSEConfig, isSSEEnabled, isFeatureEnabled } from "./index";
import type { SSEConfig } from "../types";

/**
 * Configuration guard that throws if SSE is disabled
 */
export function requireSSEEnabled(): void {
  if (!isSSEEnabled()) {
    throw new Error("SSE feature is disabled");
  }
}

/**
 * Configuration guard that throws if specific feature is disabled
 */
export function requireFeatureEnabled(
  feature: keyof Omit<SSEConfig["features"], "enabled">,
): void {
  if (!isFeatureEnabled(feature)) {
    throw new Error(`SSE feature '${feature}' is disabled`);
  }
}

/**
 * Get configuration with environment-specific overrides
 */
export function getConfigForEnvironment(): SSEConfig {
  const config = getSSEConfig();
  const env = process.env.NODE_ENV || "development";

  // Apply environment-specific adjustments
  switch (env) {
    case "test":
      return {
        ...config,
        heartbeat: {
          ...config.heartbeat,
          interval: Math.min(config.heartbeat.interval, 1000), // Max 1 second in tests
        },
        monitoring: {
          ...config.monitoring,
          enabled: false, // Disable monitoring in tests
        },
      };

    case "development":
      return {
        ...config,
        monitoring: {
          ...config.monitoring,
          logLevel: "debug", // More verbose logging in development
        },
      };

    default:
      return config;
  }
}

/**
 * Check if configuration allows new connections
 */
export function canAcceptNewConnections(currentConnections: number): boolean {
  const config = getSSEConfig();
  return currentConnections < config.limits.maxConnections;
}

/**
 * Check if payload size is within limits
 */
export function isPayloadSizeValid(payloadSize: number): boolean {
  const config = getSSEConfig();
  return payloadSize <= config.limits.maxPayloadSize;
}

/**
 * Get connection timeout in milliseconds
 */
export function getConnectionTimeout(): number {
  const config = getSSEConfig();
  return config.limits.connectionTimeout;
}

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string): boolean {
  const config = getSSEConfig();

  // If no origins are configured, allow all
  if (config.security.allowedOrigins.length === 0) {
    return true;
  }

  return config.security.allowedOrigins.includes(origin);
}

/**
 * Get rate limit configuration
 */
export function getRateLimitConfig() {
  const config = getSSEConfig();
  return {
    enabled: isFeatureEnabled("rateLimiting"),
    maxEventsPerSecond: config.limits.maxEventsPerSecond,
  };
}

/**
 * Get security configuration
 */
export function getSecurityConfig() {
  const config = getSSEConfig();
  return {
    requireAuth:
      config.security.requireAuth && isFeatureEnabled("authentication"),
    allowedOrigins: config.security.allowedOrigins,
    maxConnectionsPerUser: config.security.maxConnectionsPerUser,
    maxConnectionsPerIP: config.security.maxConnectionsPerIP,
  };
}

/**
 * Get monitoring configuration
 */
export function getMonitoringConfig() {
  const config = getSSEConfig();
  return {
    enabled: config.monitoring.enabled && isFeatureEnabled("monitoring"),
    metricsInterval: config.monitoring.metricsInterval,
    logLevel: config.monitoring.logLevel,
  };
}
