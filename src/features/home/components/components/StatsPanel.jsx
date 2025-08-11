import React from "react";
import "../../../../styles/statsPanel.css";
import { FiServer } from "react-icons/fi";
import {
  MdCleaningServices,
  MdOutlineQueryStats,
  MdOutlineRefresh,
} from "react-icons/md";
import { PiClock, PiPlugsConnectedBold } from "react-icons/pi";
import { FaRegHeart, FaRegUser, FaUsers } from "react-icons/fa";
import { GiDuration } from "react-icons/gi";

const StatsPanel = ({ stats, isLoading, onRefresh, onCleanup }) => {
  console.log("StatsPanel received stats:", stats);

  const formatUptime = (milliseconds) => {
    if (!milliseconds || typeof milliseconds !== "number") return "N/A";

    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  // Extract data with fallbacks for different possible structures
  const getStatsData = () => {
    if (!stats) return null;

    // Handle different possible response structures
    const data = stats.data || stats;

    return {
      totalClients:
        data.totalClients ||
        data.connectedClients ||
        data.activeConnections ||
        0,
      clients: data.clients || data.connections || [],
      heartbeatInterval: data.heartbeatInterval || 30000,
      uptime: data.uptime || data.serverUptime,
      startedAt: data.startedAt || data.serverStartTime,
      totalMessages: data.totalMessages || data.messagesSent || 0,
      lastActivity: data.lastActivity || data.lastUpdate,
    };
  };

  const statsData = getStatsData();
  console.log({ statsData });
  return (
    <div className="stats-panel">
      <div className="panel-header">
        <h2>
          <FiServer /> Server Statistics
        </h2>
        <div className="stats-controls">
          <button
            onClick={onRefresh}
            className="btn btn-secondary btn-sm"
            disabled={isLoading}
          >
            <MdOutlineRefresh size={16} />
            {isLoading ? "Loading..." : "Refresh"}
          </button>
          <button
            onClick={onCleanup}
            className="btn btn-danger btn-sm"
            disabled={isLoading}
          >
            <MdCleaningServices size={16} />
            Cleanup
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="loading-indicator">
          <span className="spinner">
            <MdOutlineRefresh size={16} />
          </span>
          <span>Loading stats...</span>
        </div>
      )}

      {!isLoading && !stats && (
        <div className="no-stats">
          <p>
            <MdOutlineQueryStats /> No statistics available
          </p>
          <p className="no-stats-hint">Click refresh to fetch server stats</p>
        </div>
      )}

      {!isLoading && stats && (
        <div className="stats-content">
          {/* Debug Info - Remove this in production */}
          {/* {process.env.NODE_ENV === 'development' && (
                        <div className="debug-stats" style={{
                            background: '#f5f5f5',
                            padding: '10px',
                            margin: '10px 0',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: '#333'
                        }}>
                            <strong>Debug - Raw Stats:</strong>
                            <pre style={{ fontSize: '10px', overflow: 'auto', maxHeight: '100px' }}>
                                {JSON.stringify(stats, null, 2)}
                            </pre>
                        </div>
                    )} */}

          <div className="stats-section">
            <h3>Overview</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">
                  <PiPlugsConnectedBold /> Active Connections
                </span>
                <span className="stat-value">
                  {statsData?.totalClients || 0}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">
                  <FaRegHeart /> Heartbeat Interval
                </span>
                <span className="stat-value">
                  {statsData?.heartbeatInterval
                    ? `${statsData.heartbeatInterval / 1000}s`
                    : "N/A"}
                </span>
              </div>
              {statsData?.totalMessages !== undefined && (
                <div className="stat-item">
                  <span className="stat-label">📨 Total Messages</span>
                  <span className="stat-value">{statsData.totalMessages}</span>
                </div>
              )}
              {statsData?.uptime && (
                <div className="stat-item">
                  <span className="stat-label">
                    <GiDuration /> Server Uptime
                  </span>
                  <span className="stat-value">
                    {formatUptime(statsData.uptime)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Server Info Section */}
          {(statsData?.startedAt || statsData?.lastActivity) && (
            <div className="stats-section">
              <h3>Server Info</h3>
              <div className="stats-grid">
                {statsData?.startedAt && (
                  <div className="stat-item">
                    <span className="stat-label">
                      <PiClock /> Started At
                    </span>
                    <span className="stat-value">
                      {formatDate(statsData.startedAt)}
                    </span>
                  </div>
                )}
                {statsData?.lastActivity && (
                  <div className="stat-item">
                    <span className="stat-label">🔄 Last Activity</span>
                    <span className="stat-value">
                      {formatDate(statsData.lastActivity)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Connected Clients Section */}
          {statsData?.clients && statsData.clients.length > 0 && (
            <div className="stats-section">
              <h3>
                <FaUsers /> Connected Clients ({statsData.clients.length})
              </h3>
              <div className="clients-list">
                {statsData.clients.map((client, index) => (
                  <div key={client.id || index} className="client-item">
                    <div className="client-header">
                      <span className="client-index">#{index + 1}</span>
                      <span
                        className="client-id"
                        title={client.id || "Unknown ID"}
                      >
                        {client.id
                          ? `${client.id.substring(0, 8)}...`
                          : "Unknown"}
                      </span>
                    </div>

                    <div className="client-details">
                      <div className="client-detail">
                        <span className="detail-label">
                          <FaRegUser /> User:
                        </span>
                        <span className="detail-value">
                          {client.userId || client.user || "Anonymous"}
                        </span>
                      </div>

                      <div className="client-detail">
                        <span className="detail-label">
                          <PiPlugsConnectedBold /> Session:
                        </span>
                        <span className="detail-value">
                          {client.sessionId || client.session || "No session"}
                        </span>
                      </div>

                      <div className="client-detail">
                        <span className="detail-label">
                          <PiClock /> Connected:
                        </span>
                        <span className="detail-value">
                          {formatDate(
                            client.connectedAt ||
                              client.connected ||
                              client.timestamp,
                          )}
                        </span>
                      </div>

                      <div className="client-detail">
                        <span className="detail-label">
                          <GiDuration /> Duration:
                        </span>
                        <span className="detail-value">
                          {formatUptime(client.connectedFor || client.duration)}
                        </span>
                      </div>

                      <div className="client-detail">
                        <span className="detail-label">📡 Last Ping:</span>
                        <span className="detail-value">
                          {formatDate(
                            client.lastPing ||
                              client.lastSeen ||
                              client.lastActivity,
                          )}
                        </span>
                      </div>

                      {/* Additional client info if available */}
                      {client.userAgent && (
                        <div className="client-detail">
                          <span className="detail-label">🌐 Browser:</span>
                          <span
                            className="detail-value"
                            style={{ fontSize: "11px" }}
                          >
                            {client.userAgent.substring(0, 30)}...
                          </span>
                        </div>
                      )}

                      {client.ip && (
                        <div className="client-detail">
                          <span className="detail-label">🌍 IP:</span>
                          <span className="detail-value">{client.ip}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No clients message */}
          {statsData &&
            (statsData.totalClients === 0 ||
              !statsData.clients ||
              statsData.clients.length === 0) && (
              <div className="no-clients">
                <p>🔌 No clients currently connected</p>
                <p className="no-clients-hint">
                  Connect from the connection panel above to see client
                  information
                </p>
              </div>
            )}

          <div className="stats-footer">
            <p className="last-updated">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsPanel;
