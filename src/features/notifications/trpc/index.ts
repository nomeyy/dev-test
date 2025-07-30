import { createTRPCRouter, publicProcedure } from "@/lib/trpc";
import { z } from "zod";
import { notificationsService } from "../services";
import { createServiceContext } from "@/utils/service-utils";

const { log, handleError } = createServiceContext("notifications-service");

export const notificationsRouter = createTRPCRouter({
  list: publicProcedure.subscription(async function* (opts) {
    // use a random ID for demo purposes to avoid having to use a protected route
    // in a real application, you would use a user ID or session ID to identify the subscriber
    const id = crypto.randomUUID();
    log.info("subscribing to notifications", "Subscriber ID:", id);
    try {
      notificationsService.subscribe(id);

      yield* notificationsService.on(
        "notify",
        opts.signal,
        ([subIds, payload]) => {
          log.info("new notification", "Subscriber IDs:", subIds);
          // if the notification is for this subscriber or for everyone, yield it
          if (subIds.length === 0 || subIds.includes(id)) {
            return payload;
          }
        },
      );
    } catch (error) {
      handleError("notifications subscription", error);
    } finally {
      notificationsService.unsubscribe(id);
    }
  }),

  pingAll: publicProcedure
    .input(
      z.object({
        message: z.string().optional(),
        subIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input: { message, subIds } }) => {
      notificationsService.notify(subIds ?? [], message);
    }),
});
