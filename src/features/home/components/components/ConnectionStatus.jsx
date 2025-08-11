import React from "react";
import "../../../../styles/connectionStatus.css";
import { MdOutlineConnectedTv, MdOutlineErrorOutline } from "react-icons/md";

const ConnectionStatus = ({ status, error, clientId }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case "connected":
        return "🟢";
      case "connecting":
        return "🟡";
      case "error":
        return "🔴";
      case "disconnected":
      default:
        return "⚫";
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "connected":
        return "status-connected";
      case "connecting":
        return "status-connecting";
      case "error":
        return "status-error";
      case "disconnected":
      default:
        return "status-disconnected";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "error":
        return "Connection Error";
      case "disconnected":
      default:
        return "Disconnected";
    }
  };

  const formatClientId = (id) => {
    if (!id) return "Not available";
    return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`;
  };

  return (
    <div className="connection-status">
      <div className={`status-indicator ${getStatusClass(status)}`}>
        <span className="status-icon">{getStatusIcon(status)}</span>
        <span className="status-text">{getStatusText(status)}</span>
      </div>

      {clientId && (
        <div className="client-info">
          <div className="client-id">
            <span className="label">Client ID:</span>
            <span className="value" title={clientId}>
              {formatClientId(clientId)}
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="error-message">
          <span className="error-icon">
            <MdOutlineErrorOutline />
          </span>
          <span className="error-text">{error}</span>
        </div>
      )}

      {status === "connected" && (
        <div className="connection-info">
          <div className="info-item">
            <span className="info-icon">
              <MdOutlineConnectedTv />
            </span>
            <span>Real-time events active</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;
