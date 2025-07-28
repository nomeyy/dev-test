import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/api/root"; // This must match your backend

export const trpc = createTRPCReact<AppRouter>();
