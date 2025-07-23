/**
 * Generate a unique ID that works in both client and server environments
 */
export function generateId(): string {
  // Use crypto.randomUUID if available (Node.js 16+ and modern browsers)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback to timestamp + random number
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
