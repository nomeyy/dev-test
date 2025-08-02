// Format timestamp for display
export const formatTime = (timestamp?: string): string => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString();
};

// Get event color based on type
export const getEventColor = (type: string): string => {
  switch (type) {
    case "system:connected":
    case "connection":
      return "text-green-600 bg-green-50";
    case "system:heartbeat":
      return "text-blue-600 bg-blue-50";
    case "error":
    case "send_error":
      return "text-red-600 bg-red-50";
    case "test_message":
      return "text-purple-600 bg-purple-50";
    case "send_result":
      return "text-green-600 bg-green-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
};
