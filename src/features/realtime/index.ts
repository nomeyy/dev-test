// Export all public APIs from the realtime feature
export { realtimeService } from "./services/realtime-service";
export { realtimeRouter } from "./trpc/router";
export { RealtimeDemo } from "./components/RealtimeDemo";

// Export utility functions for easy backend integration
export {
  publishToUser,
  publishToAll,
  publishAdvanced,
} from "./utils/realtime-helpers";

// Export types
export type {
  RealtimeEvent,
  RealtimeSubscriptionInput,
  RealtimePublishOptions,
} from "./types";
export { RealtimeEventSchema, RealtimeSubscriptionInputSchema } from "./types";
