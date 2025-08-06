import { createTRPCRouter, publicProcedure } from "@/lib/trpc";
import { searchUsersHandler } from "./handlers/searchUsers";
import { SearchUsersInputSchema, brodcastEventInputSchema } from "../types";
import { brodcastEventHandler } from "./handlers/broadCastEvent";

export const searchRouter = createTRPCRouter({
  users: publicProcedure
    .input(SearchUsersInputSchema)
    .query(searchUsersHandler),
  broadCast: publicProcedure
    .input(brodcastEventInputSchema)
    .mutation(brodcastEventHandler),
});
