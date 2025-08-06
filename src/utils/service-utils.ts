import { createErrorHandler } from "@/utils/error-handlers";
import { logger } from "@/utils/logging";

export function createServiceContext(contextName: string) {
  return {
    log: logger.createContextLogger(contextName),
    handleError: createErrorHandler(contextName),
  };
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  if (size <= 0) throw new Error("Chunk size must be greater than 0");
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}
