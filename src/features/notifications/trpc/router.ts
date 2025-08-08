import { createTRPCRouter, publicProcedure } from "@/lib/trpc";
import { sseNotificationHandler } from "./handlers/notificationHandler";
import { notificationSchema } from "../types";

export const notificationRouter = createTRPCRouter({
  notification: publicProcedure
    .input(notificationSchema)
    .mutation(({ input }) => {
      return sseNotificationHandler(input);
    }),
});
