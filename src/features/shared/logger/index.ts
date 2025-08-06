type LogLevel = "info" | "warn" | "error";

interface LogParams {
  [key: string]: unknown;
}

class Logger {
  private log(level: LogLevel, message: string, params?: LogParams) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      ...params,
    };

    switch (level) {
      case "info":
        console.log(JSON.stringify(logData));
        break;
      case "warn":
        console.warn(JSON.stringify(logData));
        break;
      case "error":
        console.error(JSON.stringify(logData));
        break;
    }
  }

  info(message: string, params?: LogParams) {
    this.log("info", message, params);
  }

  warn(message: string, params?: LogParams) {
    this.log("warn", message, params);
  }

  error(message: string, params?: LogParams) {
    this.log("error", message, params);
  }
}

export const logger = new Logger();
