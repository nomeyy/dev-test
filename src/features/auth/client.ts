/**
 * Client-side only exports for the authentication module.
 * This file should be imported to use auth functionality in client components.
 */

// Hook for accessing the current authentication session state in client components
export { useSession } from "./hooks/useSession";

// Provider component that makes authentication session available to the component tree
export { SessionProvider } from "./contexts/SessionContext";

// Provider for public routes that don't require full authentication context
export { PublicSessionProvider } from "./contexts/PublicSessionContext";

// Public types that client components may need
export * from "./types/public";

// Client-side utility functions for route checking
export * from "./utils/route-utils";
