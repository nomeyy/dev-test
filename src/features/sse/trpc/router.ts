import { createTRPCRouter, publicProcedure } from "@/lib/trpc";
import { z } from "zod";
import { sseManager } from "@/lib/sse";

export const sseRouter = createTRPCRouter({
  events: publicProcedure
    .input(z.object({ id: z.string().optional() }).optional())
    .subscription(({ input }) => {
      const clientId = input?.id ?? crypto.randomUUID();
      return sseManager.subscribe(clientId);
    }),
});
