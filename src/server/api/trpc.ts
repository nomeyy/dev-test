// src/server/api/trpc.ts
import { initTRPC } from "@trpc/server";
import { type Context } from "./context"; // this usually exists already

const t = initTRPC.context<Context>().create();

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
