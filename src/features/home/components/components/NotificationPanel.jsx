import React from "react";
import {
  MdOutlineErrorOutline,
  MdOutlineNotificationsNone,
} from "react-icons/md";
import { RiSendPlaneLine } from "react-icons/ri";
import { GoBroadcast } from "react-icons/go";
import { FaRegUser } from "react-icons/fa";
import "../../../../styles/notificationPanel.css";
const NotificationPanel = ({
  onSendTest,
  onSendUser,
  onSendClient,
  onSendBroadcast,
  customMessage,
  onCustomMessageChange,
  onCustomMessageKeyPress,
  userId,
  clientId,
  isConnected,
}) => {
  return (
    <div className="notification-panel">
      <h2>
        <MdOutlineNotificationsNone />
        Send Notifications
      </h2>

      <div className="notification-section">
        <h3>Test Notifications</h3>
        <p className="section-description">
          Send predefined test notifications to all connected clients
        </p>

        <button
          onClick={onSendTest}
          className="btn btn-success"
          disabled={!isConnected}
        >
          <RiSendPlaneLine /> Send Test Notification
        </button>
      </div>

      <div className="notification-section">
        <h3
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <GoBroadcast /> Custom Broadcast
        </h3>
        <p className="section-description">
          Send a custom message to all connected clients
        </p>

        <div className="broadcast-form">
          <textarea
            value={customMessage}
            onChange={onCustomMessageChange}
            onKeyPress={onCustomMessageKeyPress}
            placeholder="Enter your broadcast message here..."
            className="message-input"
            rows="3"
            disabled={!isConnected}
          />

          <button
            onClick={onSendBroadcast}
            className="btn btn-primary"
            disabled={!isConnected || !customMessage.trim()}
          >
            <RiSendPlaneLine /> Send Broadcast
          </button>
        </div>

        <div className="input-hint">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>

      <div className="notification-section">
        <h3>User-Specific Notification</h3>
        <p className="section-description">
          Send notification to all connections of user:{" "}
          <strong>{userId}</strong>
        </p>

        <button
          onClick={onSendUser}
          className="btn btn-info"
          disabled={!isConnected || !userId}
        >
          <RiSendPlaneLine /> Send
        </button>
      </div>

      <div className="notification-section">
        <h3>Direct Message</h3>
        <p className="section-description">
          Send message directly to your current connection
        </p>

        <button
          onClick={onSendClient}
          className="btn btn-warning"
          disabled={!isConnected || !clientId}
        >
          <RiSendPlaneLine /> Send to This Client
        </button>
      </div>
      {clientId && (
        <div className="client-id-display">
          Client: {clientId.substring(0, 8)}...
        </div>
      )}

      {!isConnected && (
        <div className="connection-required">
          <div className="warning-message">
            <span className="warning-icon">
              <MdOutlineErrorOutline />
            </span>
            <span>Connect to SSE to enable notifications</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
