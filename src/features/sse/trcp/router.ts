import { createTRPCRouter, publicProcedure } from "@/lib/trpc";
import {
  BroadcastMessageSchema,
  SendMessageToUserSchema,
} from "@/features/sse/types";
import { broadcastMessageHandler } from "./hadlers/broadcastMessage";
import { sendToUserMessageHandler } from "./hadlers/sendToUsermessage";

export const sseRouter = createTRPCRouter({
  broadcast: publicProcedure
    .input(BroadcastMessageSchema)
    .mutation(broadcastMessageHandler),
  sendToUser: publicProcedure
    .input(SendMessageToUserSchema)
    .mutation(sendToUserMessageHandler),
});
