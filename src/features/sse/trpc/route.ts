import { publicProcedure, createTRPCRouter } from "@/lib/trpc";
import { getSSEManager } from '../services/sse-service';
import { z } from 'zod';

const sseManager = getSSEManager();


export const sseRouter = createTRPCRouter({
  sendMessage: publicProcedure
    .input(z.object({ message: z.string(), clientId: z.string() }))
    .mutation(({ input }) => {
      const { clientId, message } = input;
      sseManager.sendMessage({ clientId, message, target: 'user' });
      return { ok: true, sent: [clientId] };
    }),
  broadcastMessage: publicProcedure
    .input(z.object({ message: z.string() }))
    .mutation(({ input }) => {
      const { message } = input;
      sseManager.sendMessage({ message, target: 'all' });
    }),
  activeClients: publicProcedure
    .query(() => {
      return sseManager.getActiveClients();
    }),
});