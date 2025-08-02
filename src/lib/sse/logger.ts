/**
 * SSE Logger - Centralized logging system for SSE operations
 * Provides structured logging with different levels and contexts
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
  clientId?: string;
  userId?: string;
  sessionId?: string;
}

class SSELogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 log entries
  private logLevel: LogLevel = LogLevel.INFO;

  /**
   * Set minimum log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.log(LogLevel.INFO, "Logger", `Log level set to ${LogLevel[level]}`);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    component: string,
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
    clientId?: string,
    userId?: string,
    sessionId?: string,
  ): void {
    if (level < this.logLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      context,
      error,
      clientId,
      userId,
      sessionId,
    };

    // Add to internal log storage
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest entry
    }

    // Console output with formatting
    this.outputToConsole(entry);
  }

  /**
   * Format and output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const levelStr = LogLevel[entry.level].padEnd(8);
    const component = entry.component.padEnd(15);

    let logMessage = `[${timestamp}] ${levelStr} ${component} ${entry.message}`;

    // Add client context if available
    if (entry.clientId || entry.userId || entry.sessionId) {
      const context = [];
      if (entry.clientId) context.push(`client:${entry.clientId}`);
      if (entry.userId) context.push(`user:${entry.userId}`);
      if (entry.sessionId) context.push(`session:${entry.sessionId}`);
      logMessage += ` [${context.join(", ")}]`;
    }

    // Add additional context
    if (entry.context && Object.keys(entry.context).length > 0) {
      logMessage += ` ${JSON.stringify(entry.context)}`;
    }

    // Output based on log level
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage);
        break;
      case LogLevel.INFO:
        console.info(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        if (entry.error) console.warn(entry.error);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(logMessage);
        if (entry.error) console.error(entry.error);
        break;
    }
  }

  /**
   * Debug level logging
   */
  debug(
    component: string,
    message: string,
    context?: Record<string, unknown>,
    clientId?: string,
    userId?: string,
    sessionId?: string,
  ): void {
    this.log(
      LogLevel.DEBUG,
      component,
      message,
      context,
      undefined,
      clientId,
      userId,
      sessionId,
    );
  }

  /**
   * Info level logging
   */
  info(
    component: string,
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
    clientId?: string,
    userId?: string,
    sessionId?: string,
  ): void {
    this.log(
      LogLevel.INFO,
      component,
      message,
      context,
      error,
      clientId,
      userId,
      sessionId,
    );
  }

  /**
   * Warning level logging
   */
  warn(
    component: string,
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
    clientId?: string,
    userId?: string,
    sessionId?: string,
  ): void {
    this.log(
      LogLevel.WARN,
      component,
      message,
      context,
      error,
      clientId,
      userId,
      sessionId,
    );
  }

  /**
   * Error level logging
   */
  error(
    component: string,
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
    clientId?: string,
    userId?: string,
    sessionId?: string,
  ): void {
    this.log(
      LogLevel.ERROR,
      component,
      message,
      context,
      error,
      clientId,
      userId,
      sessionId,
    );
  }

  /**
   * Critical level logging
   */
  critical(
    component: string,
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
    clientId?: string,
    userId?: string,
    sessionId?: string,
  ): void {
    this.log(
      LogLevel.CRITICAL,
      component,
      message,
      context,
      error,
      clientId,
      userId,
      sessionId,
    );
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count = 50, level?: LogLevel): LogEntry[] {
    let filteredLogs = this.logs;

    if (level !== undefined) {
      filteredLogs = this.logs.filter((log) => log.level >= level);
    }

    return filteredLogs.slice(-count);
  }

  /**
   * Get logs for specific client
   */
  getClientLogs(clientId: string, count = 50): LogEntry[] {
    return this.logs.filter((log) => log.clientId === clientId).slice(-count);
  }

  /**
   * Get logs for specific user
   */
  getUserLogs(userId: string, count = 50): LogEntry[] {
    return this.logs.filter((log) => log.userId === userId).slice(-count);
  }

  /**
   * Get error logs only
   */
  getErrorLogs(count = 50): LogEntry[] {
    return this.logs.filter((log) => log.level >= LogLevel.ERROR).slice(-count);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    const logCount = this.logs.length;
    this.logs = [];
    this.info("Logger", `Cleared ${logCount} log entries`);
  }

  /**
   * Get log statistics
   */
  getStats(): Record<string, unknown> {
    const stats = {
      totalLogs: this.logs.length,
      logLevel: LogLevel[this.logLevel],
      levelCounts: {} as Record<string, number>,
      componentCounts: {} as Record<string, number>,
      recentErrors: this.getErrorLogs(10).length,
    };

    // Count by level
    for (const level of Object.values(LogLevel)) {
      if (typeof level === "number") {
        stats.levelCounts[LogLevel[level]] = this.logs.filter(
          (log) => log.level === level,
        ).length;
      }
    }

    // Count by component
    for (const log of this.logs) {
      stats.componentCounts[log.component] =
        (stats.componentCounts[log.component] ?? 0) + 1;
    }

    return stats;
  }
}

// Singleton instance
export const sseLogger = new SSELogger();

// Set log level based on environment
if (process.env.NODE_ENV === "development") {
  sseLogger.setLogLevel(LogLevel.DEBUG);
} else if (process.env.NODE_ENV === "production") {
  sseLogger.setLogLevel(LogLevel.INFO);
}
