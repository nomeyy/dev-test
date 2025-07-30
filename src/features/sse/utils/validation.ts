import { z } from "zod";
import type { SSEMessage } from "../types";

/**
 * Schema for validating SSE messages
 */
export const sseMessageSchema = z.object({
  event: z.string().min(1, "Event name is required"),
  data: z.any(),
  target: z.enum(["all", "user", "session", "client"]).optional(),
  targetId: z.string().optional(),
});

/**
 * Validate an SSE message
 */
export function validateSSEMessage(message: unknown): message is SSEMessage {
  try {
    sseMessageSchema.parse(message);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate SSE message with detailed error information
 */
export function validateSSEMessageWithErrors(message: unknown): {
  isValid: boolean;
  errors: string[];
} {
  try {
    sseMessageSchema.parse(message);
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(
          (err) => `${err.path.join(".")}: ${err.message}`,
        ),
      };
    }
    return { isValid: false, errors: ["Unknown validation error"] };
  }
}

/**
 * Schema for common SSE event types
 */
export const commonEventSchemas = {
  notification: z.object({
    title: z.string(),
    message: z.string(),
    type: z.enum(["info", "success", "warning", "error"]).optional(),
    timestamp: z.number().optional(),
  }),

  userActivity: z.object({
    activity: z.string(),
    data: z.any(),
    timestamp: z.number().optional(),
  }),

  systemUpdate: z.object({
    component: z.string(),
    status: z.string(),
    message: z.string().optional(),
    timestamp: z.number().optional(),
  }),
};

/**
 * Validate specific event types
 */
export function validateEventData(event: string, data: unknown): boolean {
  const schema = commonEventSchemas[event as keyof typeof commonEventSchemas];
  if (!schema) {
    return true; // Unknown event types are allowed
  }

  try {
    schema.parse(data);
    return true;
  } catch {
    return false;
  }
}
