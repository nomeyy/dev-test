// Export the main router
export { notificationsRouter } from "./trpc";

// Export the service layer
export { 
  notificationsService,
  notificationManager,
  registerModule,
  setupMockEvents,
  configureTargetSelector,
  startMockEvents,
  stopMockEvents
} from "./services";

// Export types
export * from "./types";

// Initialize the notification system
export { setupMockEvents as initNotifications } from "./services";