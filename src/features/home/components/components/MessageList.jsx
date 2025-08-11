import React from "react";
import "../../../../styles/messageList.css";

const MessageList = ({ messages }) => {
  const getMessageIcon = (type, eventType) => {
    switch (type) {
      case "system":
        return "⚙️";
      case "heartbeat":
        return "💓";
      case "notification":
        return "🔔";
      case "broadcast":
        return "📢";
      case "error":
        return "❌";
      default:
        return "📝";
    }
  };

  const getMessageTypeClass = (type, eventType) => {
    switch (type) {
      case "system":
        return "message-system";
      case "heartbeat":
        return "message-heartbeat";
      case "notification":
        return "message-notification";
      case "broadcast":
        return "message-broadcast";
      case "error":
        return "message-error";
      default:
        return "message-default";
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatData = (data) => {
    if (!data || Object.keys(data).length === 0) return null;

    if (data.message === "heartbeat") {
      return {
        activeClients: data.activeClients,
        serverTime: data.serverTime ? formatTime(data.serverTime) : null,
      };
    }

    return data;
  };

  if (messages.length === 0) {
    return (
      <div className="message-list empty">
        <div className="empty-state">
          <p>🔍 No messages yet</p>
          <p className="empty-subtitle">
            Connect to start receiving real-time events
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message, index) => {
        const messageClass = getMessageTypeClass(
          message.type,
          message.eventType,
        );
        const icon = getMessageIcon(message.type, message.eventType);
        const formattedData = formatData(message.data);

        return (
          <div
            key={`${message.id}-${index}`}
            className={`message ${messageClass}`}
          >
            <div className="message-header">
              <span className="message-icon">{icon}</span>
              <span className="message-event-type">
                {message.eventType?.toUpperCase() || "MESSAGE"}
              </span>
              <span className="message-time">
                {formatTime(message.timestamp)}
              </span>
            </div>

            <div className="message-content">{message.message}</div>

            {formattedData && (
              <div className="message-data">
                <details>
                  <summary>📋 Data</summary>
                  <pre>{JSON.stringify(formattedData, null, 2)}</pre>
                </details>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MessageList;
