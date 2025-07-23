import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/lib/trpc";
import {
  sendEventToConnectionHandler,
  sendEventToUserHandler,
  sendEventToConnectionsHandler,
  broadcastEventHandler,
} from "./handlers/sendEvent";
import { getSSEStatsHandler, getConnectionsHandler } from "./handlers/getStats";
import { sendTestEventHandler } from "./handlers/sendTestEvent";
import {
  SSEEventType,
  PingEventSchema,
  NotificationEventSchema,
  UserUpdateEventSchema,
  ReelUploadStatusEventSchema,
  SystemMessageEventSchema,
} from "../types";

// Union schema for all event types (strict)
const SSEEventUnionSchema = z.discriminatedUnion("type", [
  PingEventSchema,
  NotificationEventSchema,
  UserUpdateEventSchema,
  ReelUploadStatusEventSchema,
  SystemMessageEventSchema,
]);

// Flexible schema for custom events
const FlexibleSSEEventSchema = z.object({
  id: z.string(),
  type: z.string(), // Allow any string as event type
  timestamp: z.number(),
  data: z.record(z.unknown()), // Allow any data structure
});

// Input schemas
const SendEventToConnectionSchema = z.object({
  connectionId: z.string(),
  event: SSEEventUnionSchema,
});

const SendEventToUserSchema = z.object({
  userId: z.string(),
  event: SSEEventUnionSchema,
});

const SendEventToConnectionsSchema = z.object({
  connectionIds: z.array(z.string()),
  event: SSEEventUnionSchema,
});

const BroadcastEventSchema = z.object({
  event: SSEEventUnionSchema,
});

// Flexible schemas for custom events
const SendFlexibleEventToConnectionSchema = z.object({
  connectionId: z.string(),
  event: FlexibleSSEEventSchema,
});

const SendFlexibleEventToConnectionsSchema = z.object({
  connectionIds: z.array(z.string()),
  event: FlexibleSSEEventSchema,
});

const BroadcastFlexibleEventSchema = z.object({
  event: FlexibleSSEEventSchema,
});

const SendTestEventSchema = z.object({
  type: z.nativeEnum(SSEEventType),
  connectionId: z.string().optional(),
  userId: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

export const sseRouter = createTRPCRouter({
  // Send event to specific connection
  sendEventToConnection: publicProcedure
    .input(SendEventToConnectionSchema)
    .mutation(sendEventToConnectionHandler),

  // Send event to all connections for a user
  sendEventToUser: publicProcedure
    .input(SendEventToUserSchema)
    .mutation(sendEventToUserHandler),

  // Send event to selected connections
  sendEventToConnections: publicProcedure
    .input(SendEventToConnectionsSchema)
    .mutation(sendEventToConnectionsHandler),

  // Broadcast event to all connections
  broadcastEvent: publicProcedure
    .input(BroadcastEventSchema)
    .mutation(broadcastEventHandler),

  // Get SSE statistics
  getStats: publicProcedure.query(getSSEStatsHandler),

  // Get active connections
  getConnections: publicProcedure.query(getConnectionsHandler),

  // Send test event (for testing purposes)
  sendTestEvent: publicProcedure
    .input(SendTestEventSchema)
    .mutation(sendTestEventHandler),

  // Flexible event endpoints (allow any event type)
  sendFlexibleEventToConnection: publicProcedure
    .input(SendFlexibleEventToConnectionSchema)
    .mutation(sendEventToConnectionHandler),

  sendFlexibleEventToConnections: publicProcedure
    .input(SendFlexibleEventToConnectionsSchema)
    .mutation(sendEventToConnectionsHandler),

  broadcastFlexibleEvent: publicProcedure
    .input(BroadcastFlexibleEventSchema)
    .mutation(broadcastEventHandler),
});
