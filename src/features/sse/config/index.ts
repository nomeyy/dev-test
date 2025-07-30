/**
 * SSE Configuration utilities
 */

import type {
  SSEConfig,
  HeartbeatConfig,
  SSEFeatureFlags,
  SSEConfigValidationError,
} from "../types";

/**
 * Default SSE configuration
 */
export const DEFAULT_SSE_CONFIG: SSEConfig = {
  heartbeat: {
    interval: 30000, // 30 seconds
    timeout: 60000, // 1 minute
    maxMissedPings: 3,
    enabled: true,
  },
  redis: {
    keyPrefix: "sse:",
    connectionTtl: 3600, // 1 hour
    cleanupInterval: 300, // 5 minutes
  },
  limits: {
    maxConnections: 10000,
    maxEventsPerSecond: 1000,
    maxPayloadSize: 65536, // 64KB
    connectionTimeout: 300000, // 5 minutes
  },
  features: {
    enabled: true,
    heartbeat: true,
    authentication: true,
    rateLimiting: true,
    monitoring: true,
    compression: false,
  },
  monitoring: {
    enabled: true,
    metricsInterval: 60000, // 1 minute
    logLevel: "info",
  },
  security: {
    requireAuth: true,
    allowedOrigins: [],
    maxConnectionsPerUser: 10,
    maxConnectionsPerIP: 50,
  },
};

/**
 * Safely parse integer with fallback to default
 */
function safeParseInt(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse allowed origins from environment variable
 */
function parseAllowedOrigins(value: string | undefined): string[] {
  if (!value || value.trim() === "") return [];
  return value
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}

/**
 * Get SSE configuration from environment variables with defaults
 */
export function getSSEConfig(): SSEConfig {
  const config: SSEConfig = {
    heartbeat: {
      interval: safeParseInt(
        process.env.SSE_HEARTBEAT_INTERVAL,
        DEFAULT_SSE_CONFIG.heartbeat.interval,
      ),
      timeout: safeParseInt(
        process.env.SSE_HEARTBEAT_TIMEOUT,
        DEFAULT_SSE_CONFIG.heartbeat.timeout,
      ),
      maxMissedPings: safeParseInt(
        process.env.SSE_MAX_MISSED_PINGS,
        DEFAULT_SSE_CONFIG.heartbeat.maxMissedPings,
      ),
      enabled: process.env.SSE_HEARTBEAT_ENABLED !== "false",
    },
    redis: {
      keyPrefix:
        process.env.SSE_REDIS_KEY_PREFIX || DEFAULT_SSE_CONFIG.redis.keyPrefix,
      connectionTtl: safeParseInt(
        process.env.SSE_CONNECTION_TTL,
        DEFAULT_SSE_CONFIG.redis.connectionTtl,
      ),
      cleanupInterval: safeParseInt(
        process.env.SSE_CLEANUP_INTERVAL,
        DEFAULT_SSE_CONFIG.redis.cleanupInterval,
      ),
    },
    limits: {
      maxConnections: safeParseInt(
        process.env.SSE_MAX_CONNECTIONS,
        DEFAULT_SSE_CONFIG.limits.maxConnections,
      ),
      maxEventsPerSecond: safeParseInt(
        process.env.SSE_MAX_EVENTS_PER_SECOND,
        DEFAULT_SSE_CONFIG.limits.maxEventsPerSecond,
      ),
      maxPayloadSize: safeParseInt(
        process.env.SSE_MAX_PAYLOAD_SIZE,
        DEFAULT_SSE_CONFIG.limits.maxPayloadSize,
      ),
      connectionTimeout: safeParseInt(
        process.env.SSE_CONNECTION_TIMEOUT,
        DEFAULT_SSE_CONFIG.limits.connectionTimeout,
      ),
    },
    features: {
      enabled: process.env.SSE_ENABLED !== "false",
      heartbeat: process.env.SSE_FEATURE_HEARTBEAT !== "false",
      authentication: process.env.SSE_FEATURE_AUTH !== "false",
      rateLimiting: process.env.SSE_FEATURE_RATE_LIMITING !== "false",
      monitoring: process.env.SSE_FEATURE_MONITORING !== "false",
      compression: process.env.SSE_FEATURE_COMPRESSION === "true",
    },
    monitoring: {
      enabled: process.env.SSE_MONITORING_ENABLED !== "false",
      metricsInterval: safeParseInt(
        process.env.SSE_METRICS_INTERVAL,
        DEFAULT_SSE_CONFIG.monitoring.metricsInterval,
      ),
      logLevel:
        (process.env.SSE_LOG_LEVEL as "debug" | "info" | "warn" | "error") ||
        DEFAULT_SSE_CONFIG.monitoring.logLevel,
    },
    security: {
      requireAuth: process.env.SSE_REQUIRE_AUTH !== "false",
      allowedOrigins: parseAllowedOrigins(process.env.SSE_ALLOWED_ORIGINS),
      maxConnectionsPerUser: safeParseInt(
        process.env.SSE_MAX_CONNECTIONS_PER_USER,
        DEFAULT_SSE_CONFIG.security.maxConnectionsPerUser,
      ),
      maxConnectionsPerIP: safeParseInt(
        process.env.SSE_MAX_CONNECTIONS_PER_IP,
        DEFAULT_SSE_CONFIG.security.maxConnectionsPerIP,
      ),
    },
  };

  // Validate configuration
  const validation = validateSSEConfig(config);
  if (!validation.isValid) {
    throw new Error(
      `Invalid SSE configuration: ${validation.errors.join(", ")}`,
    );
  }

  return config;
}

/**
 * Validate SSE configuration
 */
export function validateSSEConfig(config: SSEConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Heartbeat validation
  if (config.heartbeat.interval <= 0) {
    errors.push("Heartbeat interval must be greater than 0");
  }
  if (config.heartbeat.timeout <= config.heartbeat.interval) {
    errors.push("Heartbeat timeout must be greater than interval");
  }
  if (config.heartbeat.maxMissedPings <= 0) {
    errors.push("Max missed pings must be greater than 0");
  }

  // Redis validation
  if (config.redis.connectionTtl <= 0) {
    errors.push("Redis connection TTL must be greater than 0");
  }
  if (config.redis.cleanupInterval <= 0) {
    errors.push("Redis cleanup interval must be greater than 0");
  }
  if (!config.redis.keyPrefix || config.redis.keyPrefix.trim() === "") {
    errors.push("Redis key prefix cannot be empty");
  }

  // Limits validation
  if (config.limits.maxConnections <= 0) {
    errors.push("Max connections must be greater than 0");
  }
  if (config.limits.maxEventsPerSecond <= 0) {
    errors.push("Max events per second must be greater than 0");
  }
  if (config.limits.maxPayloadSize <= 0) {
    errors.push("Max payload size must be greater than 0");
  }
  if (config.limits.connectionTimeout <= 0) {
    errors.push("Connection timeout must be greater than 0");
  }

  // Monitoring validation
  if (config.monitoring.metricsInterval <= 0) {
    errors.push("Metrics interval must be greater than 0");
  }
  if (
    !["debug", "info", "warn", "error"].includes(config.monitoring.logLevel)
  ) {
    errors.push("Log level must be one of: debug, info, warn, error");
  }

  // Security validation
  if (config.security.maxConnectionsPerUser <= 0) {
    errors.push("Max connections per user must be greater than 0");
  }
  if (config.security.maxConnectionsPerIP <= 0) {
    errors.push("Max connections per IP must be greater than 0");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get feature flags for SSE functionality
 */
export function getSSEFeatureFlags(): SSEFeatureFlags {
  const config = getSSEConfig();
  return config.features;
}

/**
 * Check if SSE feature is enabled
 */
export function isSSEEnabled(): boolean {
  return getSSEFeatureFlags().enabled;
}

/**
 * Check if specific SSE feature is enabled
 */
export function isFeatureEnabled(
  feature: keyof Omit<SSEFeatureFlags, "enabled">,
): boolean {
  const flags = getSSEFeatureFlags();
  return flags.enabled && flags[feature];
}

/**
 * Get configuration for a specific environment
 */
export function getEnvironmentConfig(
  environment: "development" | "test" | "production",
): Partial<SSEConfig> {
  const baseConfig = getSSEConfig();

  switch (environment) {
    case "development":
      return {
        ...baseConfig,
        heartbeat: {
          ...baseConfig.heartbeat,
          interval: 10000, // Faster heartbeat for development
        },
        monitoring: {
          ...baseConfig.monitoring,
          logLevel: "debug",
        },
        limits: {
          ...baseConfig.limits,
          maxConnections: 100, // Lower limits for development
        },
      };

    case "test":
      return {
        ...baseConfig,
        heartbeat: {
          ...baseConfig.heartbeat,
          interval: 1000, // Very fast for tests
          timeout: 2000,
        },
        monitoring: {
          ...baseConfig.monitoring,
          enabled: false, // Disable monitoring in tests
        },
        features: {
          ...baseConfig.features,
          monitoring: false,
        },
      };

    case "production":
      return {
        ...baseConfig,
        monitoring: {
          ...baseConfig.monitoring,
          logLevel: "warn", // Less verbose logging in production
        },
        security: {
          ...baseConfig.security,
          requireAuth: true, // Always require auth in production
        },
      };

    default:
      return baseConfig;
  }
}

/**
 * Merge configuration with overrides
 */
export function mergeSSEConfig(
  base: SSEConfig,
  overrides: Partial<SSEConfig>,
): SSEConfig {
  return {
    heartbeat: { ...base.heartbeat, ...overrides.heartbeat },
    redis: { ...base.redis, ...overrides.redis },
    limits: { ...base.limits, ...overrides.limits },
    features: { ...base.features, ...overrides.features },
    monitoring: { ...base.monitoring, ...overrides.monitoring },
    security: { ...base.security, ...overrides.security },
  };
}
