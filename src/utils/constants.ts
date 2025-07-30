import type {
  BroadcastEventData,
  EventConfig,
  HomeMessageConfig,
} from "@/types/sse";

export const EVENT_TYPES = {
  BROADCAST: "broadcast",
  CLIENT_CONNECT: "client-connect",
  CLIENT_DISCONNECT: "client-disconnect",
} as const;

export const MESSAGE_TYPES = {
  STATUS: "status",
  TARGETED: "targeted",
  BROADCAST: "broadcast",
} as const;

export const getEventConfig = (
  eventType: string,
  data: BroadcastEventData,
): EventConfig => {
  switch (eventType) {
    case EVENT_TYPES.BROADCAST:
      if (data.clientId) {
        return {
          label: `Direct to ${data.clientId.slice(0, 6)}`,
          color: "#b266ff",
          iconType: "user",
          bubbleClass:
            "bg-gradient-to-r from-[#b266ff]/30 to-[#4f8cff]/30 border-[#b266ff]/30",
        };
      } else {
        return {
          label: "Broadcast to all",
          color: "#4f8cff",
          iconType: "megaphone",
          bubbleClass:
            "bg-gradient-to-r from-[#4f8cff]/30 to-[#b266ff]/30 border-[#4f8cff]/30",
        };
      }

    case EVENT_TYPES.CLIENT_CONNECT:
      return {
        label: `Client connected: ${data.id?.slice(0, 6)}`,
        color: "#ffd700",
        iconType: "check-circle",
        bubbleClass: "bg-white/10 border-white/10",
      };

    case EVENT_TYPES.CLIENT_DISCONNECT:
      return {
        label: `Client disconnected: ${data.id?.slice(0, 6)}`,
        color: "#ff4d4d",
        iconType: "x-circle",
        bubbleClass: "bg-white/10 border-white/10",
      };

    default:
      return {
        label: "Unknown event",
        color: "#ffffff",
        iconType: "check-circle",
        bubbleClass: "bg-white/10 border-white/10",
      };
  }
};

export const getHomeMessageConfig = (
  messageType: string,
  isTargeted = false,
): HomeMessageConfig => {
  if (messageType === MESSAGE_TYPES.STATUS) {
    return {
      label: "Status message",
      color: "#ffd700",
      iconType: "radio",
      bubbleClass: "bg-white/10 border-white/10",
    };
  } else if (isTargeted) {
    return {
      label: "Direct message to you",
      color: "#b266ff",
      iconType: "user",
      bubbleClass:
        "bg-gradient-to-r from-[#b266ff]/30 to-[#4f8cff]/30 border-[#b266ff]/30",
    };
  } else {
    return {
      label: "Broadcast to all",
      color: "#4f8cff",
      iconType: "megaphone",
      bubbleClass:
        "bg-gradient-to-r from-[#4f8cff]/30 to-[#b266ff]/30 border-[#4f8cff]/30",
    };
  }
};
