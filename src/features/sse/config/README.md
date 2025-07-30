# SSE Configuration Documentation

This document describes all configuration options available for the Server-Sent Events (SSE) layer.

## Environment Variables

### Core SSE Settings

| Variable      | Type    | Default | Description                           |
| ------------- | ------- | ------- | ------------------------------------- |
| `SSE_ENABLED` | boolean | `true`  | Enable/disable the entire SSE feature |

### Heartbeat Configuration

| Variable                 | Type    | Default | Description                                     |
| ------------------------ | ------- | ------- | ----------------------------------------------- |
| `SSE_HEARTBEAT_ENABLED`  | boolean | `true`  | Enable/disable heartbeat mechanism              |
| `SSE_HEARTBEAT_INTERVAL` | number  | `30000` | Heartbeat interval in milliseconds (30 seconds) |
| `SSE_HEARTBEAT_TIMEOUT`  | number  | `60000` | Heartbeat timeout in milliseconds (1 minute)    |
| `SSE_MAX_MISSED_PINGS`   | number  | `3`     | Maximum missed pings before connection cleanup  |

### Redis Configuration

| Variable               | Type   | Default  | Description                                      |
| ---------------------- | ------ | -------- | ------------------------------------------------ |
| `SSE_REDIS_KEY_PREFIX` | string | `"sse:"` | Prefix for all Redis keys used by SSE            |
| `SSE_CONNECTION_TTL`   | number | `3600`   | Connection TTL in Redis (seconds)                |
| `SSE_CLEANUP_INTERVAL` | number | `300`    | Cleanup interval for stale connections (seconds) |

### Connection Limits

| Variable                    | Type   | Default  | Description                                    |
| --------------------------- | ------ | -------- | ---------------------------------------------- |
| `SSE_MAX_CONNECTIONS`       | number | `10000`  | Maximum total concurrent connections           |
| `SSE_MAX_EVENTS_PER_SECOND` | number | `1000`   | Maximum events per second rate limit           |
| `SSE_MAX_PAYLOAD_SIZE`      | number | `65536`  | Maximum event payload size in bytes (64KB)     |
| `SSE_CONNECTION_TIMEOUT`    | number | `300000` | Connection timeout in milliseconds (5 minutes) |

### Feature Flags

| Variable                    | Type    | Default | Description                       |
| --------------------------- | ------- | ------- | --------------------------------- |
| `SSE_FEATURE_HEARTBEAT`     | boolean | `true`  | Enable heartbeat feature          |
| `SSE_FEATURE_AUTH`          | boolean | `true`  | Enable authentication integration |
| `SSE_FEATURE_RATE_LIMITING` | boolean | `true`  | Enable rate limiting              |
| `SSE_FEATURE_MONITORING`    | boolean | `true`  | Enable monitoring and metrics     |
| `SSE_FEATURE_COMPRESSION`   | boolean | `false` | Enable response compression       |

### Monitoring Configuration

| Variable                 | Type    | Default  | Description                                 |
| ------------------------ | ------- | -------- | ------------------------------------------- |
| `SSE_MONITORING_ENABLED` | boolean | `true`   | Enable monitoring system                    |
| `SSE_METRICS_INTERVAL`   | number  | `60000`  | Metrics collection interval in milliseconds |
| `SSE_LOG_LEVEL`          | string  | `"info"` | Log level: debug, info, warn, error         |

### Security Configuration

| Variable                       | Type    | Default | Description                                |
| ------------------------------ | ------- | ------- | ------------------------------------------ |
| `SSE_REQUIRE_AUTH`             | boolean | `true`  | Require authentication for connections     |
| `SSE_ALLOWED_ORIGINS`          | string  | `""`    | Comma-separated list of allowed origins    |
| `SSE_MAX_CONNECTIONS_PER_USER` | number  | `10`    | Maximum connections per authenticated user |
| `SSE_MAX_CONNECTIONS_PER_IP`   | number  | `50`    | Maximum connections per IP address         |

## Configuration Examples

### Development Environment

```bash
# .env.local
SSE_ENABLED=true
SSE_HEARTBEAT_INTERVAL=10000
SSE_LOG_LEVEL=debug
SSE_MAX_CONNECTIONS=100
SSE_REQUIRE_AUTH=false
```

### Production Environment

```bash
# .env.production
SSE_ENABLED=true
SSE_HEARTBEAT_INTERVAL=30000
SSE_LOG_LEVEL=warn
SSE_MAX_CONNECTIONS=10000
SSE_REQUIRE_AUTH=true
SSE_ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### Testing Environment

```bash
# .env.test
SSE_ENABLED=true
SSE_HEARTBEAT_INTERVAL=1000
SSE_HEARTBEAT_TIMEOUT=2000
SSE_MONITORING_ENABLED=false
SSE_FEATURE_MONITORING=false
```

## Programmatic Configuration

### Basic Usage

```typescript
import { getSSEConfig, validateSSEConfig } from "@/features/sse/config";

// Get current configuration
const config = getSSEConfig();

// Validate configuration
const validation = validateSSEConfig(config);
if (!validation.isValid) {
  console.error("Configuration errors:", validation.errors);
}
```

### Feature Flags

```typescript
import { isSSEEnabled, isFeatureEnabled } from "@/features/sse/config";

// Check if SSE is enabled
if (isSSEEnabled()) {
  // SSE functionality is available
}

// Check specific features
if (isFeatureEnabled("heartbeat")) {
  // Heartbeat is enabled
}

if (isFeatureEnabled("authentication")) {
  // Authentication is required
}
```

### Environment-Specific Configuration

```typescript
import { getEnvironmentConfig } from "@/features/sse/config";

// Get configuration for specific environment
const devConfig = getEnvironmentConfig("development");
const prodConfig = getEnvironmentConfig("production");
const testConfig = getEnvironmentConfig("test");
```

### Configuration Merging

```typescript
import { mergeSSEConfig, getSSEConfig } from "@/features/sse/config";

const baseConfig = getSSEConfig();
const customConfig = mergeSSEConfig(baseConfig, {
  heartbeat: {
    interval: 15000, // Override heartbeat interval
  },
  limits: {
    maxConnections: 5000, // Override max connections
  },
});
```

## Configuration Validation

The configuration system includes comprehensive validation:

### Validation Rules

1. **Heartbeat Configuration**
   - Interval must be greater than 0
   - Timeout must be greater than interval
   - Max missed pings must be greater than 0

2. **Redis Configuration**
   - Connection TTL must be greater than 0
   - Cleanup interval must be greater than 0
   - Key prefix cannot be empty

3. **Limits Configuration**
   - All limit values must be greater than 0
   - Connection timeout must be reasonable

4. **Monitoring Configuration**
   - Metrics interval must be greater than 0
   - Log level must be valid (debug, info, warn, error)

5. **Security Configuration**
   - Max connections per user/IP must be greater than 0

### Error Handling

```typescript
import { getSSEConfig } from "@/features/sse/config";

try {
  const config = getSSEConfig();
  // Configuration is valid
} catch (error) {
  console.error("Invalid SSE configuration:", error.message);
  // Handle configuration error
}
```

## Best Practices

### Development

- Use shorter heartbeat intervals for faster feedback
- Enable debug logging for troubleshooting
- Lower connection limits to prevent resource exhaustion
- Disable authentication for easier testing

### Production

- Use longer heartbeat intervals to reduce server load
- Set appropriate connection limits based on server capacity
- Enable authentication and security features
- Use warn or error log levels to reduce noise
- Configure allowed origins for CORS security

### Testing

- Use very short intervals for faster test execution
- Disable monitoring to reduce test complexity
- Use in-memory storage when possible
- Mock external dependencies

## Troubleshooting

### Common Issues

1. **Configuration Validation Errors**
   - Check that all numeric values are positive
   - Ensure timeout values are greater than intervals
   - Verify log level is one of the allowed values

2. **Performance Issues**
   - Increase heartbeat intervals to reduce server load
   - Adjust connection limits based on server capacity
   - Enable compression for large payloads

3. **Connection Problems**
   - Check authentication requirements
   - Verify allowed origins configuration
   - Review connection timeout settings

4. **Memory Issues**
   - Reduce connection TTL to clean up faster
   - Lower max connections limits
   - Increase cleanup interval frequency

### Debug Configuration

```typescript
import { getSSEConfig, validateSSEConfig } from "@/features/sse/config";

const config = getSSEConfig();
console.log("Current SSE Configuration:", JSON.stringify(config, null, 2));

const validation = validateSSEConfig(config);
if (!validation.isValid) {
  console.error("Configuration Validation Errors:");
  validation.errors.forEach((error) => console.error(`- ${error}`));
}
```
