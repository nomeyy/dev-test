"use client";
import React, { useState, useEffect } from "react";
import ConnectionStatus from "./ConnectionStatus";
import NotificationPanel from "./NotificationPanel";
import StatsPanel from "./StatsPanel";
import MessageList from "./MessageList";
import { VscDebugDisconnect } from "react-icons/vsc";
import { TbPlugConnected, TbPlugConnectedX } from "react-icons/tb";
import { TbMessageShare } from "react-icons/tb";
import { IoTrashBinOutline } from "react-icons/io5";

import "../../../../styles/demo.css";
import useSSE from "../../../auth/hooks/useSSE";

const Home = () => {
  const [userId, setUserId] = useState("1"); // Default to user ID 1
  const [sessionId, setSessionId] = useState("session456");
  const [customMessage, setCustomMessage] = useState("");
  const [stats, setStats] = useState(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [userFetchError, setUserFetchError] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);

  const {
    connectionStatus,
    messages,
    error,
    clientId,
    connect,
    disconnect,
    clearMessages,
    isConnected,
    isConnecting,
    isError,
  } = useSSE(userId, sessionId);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Fetch available users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${API_URL}/api/users`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.success && data.users.length > 0) {
          setAvailableUsers(data.users);
          // Set first user as default if no userId is set
          if (!userId && data.users.length > 0) {
            setUserId(data.users[0].id.toString());
            setSessionId(data.users[0].sessionId || "session456");
          }
        } else {
          throw new Error("No users found");
        }
        setUserFetchError(null);
      } catch (error) {
        console.error("Error fetching users:", error);
        setUserFetchError(error.message);

        // Try to fetch a specific user as fallback
        try {
          const response = await fetch(`${API_URL}/api/user/1`);
          if (response.ok) {
            const user = await response.json();
            if (user.success) {
              setUserId(user.user.id.toString());
              setSessionId(user.user.sessionId || "session456");
              setUserFetchError(null);
            }
          }
        } catch (fallbackError) {
          console.error("Fallback user fetch failed:", fallbackError);
        }
      }
    };

    fetchUsers();
  }, []);

  // Fetch stats when connected
  useEffect(() => {
    if (isConnected) {
      const fetchStats = async () => {
        try {
          const response = await fetch(`${API_URL}/sse/stats`);
          if (response.ok) {
            const data = await response.json();
            setStats(data);
          }
        } catch (error) {
          console.error("Error fetching stats:", error);
        }
      };

      fetchStats();
      const interval = setInterval(fetchStats, 10000);

      return () => clearInterval(interval);
    }
  }, [isConnected]);

  const showAlert = (message, type = "info") => {
    const icon = type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️";
    alert(`${icon} ${message}`);
  };

  const handleApiResponse = async (response, successMessage) => {
    try {
      const result = await response.json();
      console.log("API Response:", result);

      if (result.success) {
        const clientCount = result.clientCount || 0;
        showAlert(`${successMessage} (${clientCount} clients)`, "success");
      } else {
        showAlert(result.message || "Operation failed", "error");
      }
      return result;
    } catch (error) {
      console.error("Error parsing API response:", error);
      showAlert("Error processing server response", "error");
      throw error;
    }
  };

  const sendTestNotification = async () => {
    try {
      const response = await fetch(`${API_URL}/api/test-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await handleApiResponse(response, "Test notification sent");
    } catch (error) {
      console.error("Error sending test notification:", error);
      showAlert("Error sending test notification. Check console.", "error");
    }
  };

  const sendCustomBroadcast = async () => {
    if (!customMessage.trim()) {
      showAlert("Please enter a message", "error");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/notify/broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventType: "custom-broadcast",
          data: {
            title: "Custom Broadcast",
            message: customMessage,
            sender: "Demo App",
            priority: "normal",
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await handleApiResponse(response, "Custom broadcast sent");
      setCustomMessage("");
    } catch (error) {
      console.error("Error sending custom broadcast:", error);
      showAlert("Error sending custom broadcast. Check console.", "error");
    }
  };

  const sendUserNotification = async () => {
    if (!userId.trim()) {
      showAlert("Please enter a user ID", "error");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/notify/user/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventType: "user-notification",
          data: {
            title: "Personal Message",
            message: `Hello User ${userId}! This is a personal notification.`,
            type: "info",
            priority: "high",
            recipient: userId,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await handleApiResponse(
        response,
        `User notification sent to user ${userId}`,
      );
    } catch (error) {
      console.error("Error sending user notification:", error);
      showAlert("Error sending user notification. Check console.", "error");
    }
  };

  const sendClientNotification = async () => {
    if (!clientId) {
      showAlert("No client ID available. Please connect first.", "error");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/notify/client/${clientId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventType: "direct-message",
          data: {
            title: "Direct Message",
            message: "This is a direct message to your specific connection.",
            priority: "high",
            clientId: clientId,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await handleApiResponse(
        response,
        `Direct message sent to client ${clientId.substring(0, 8)}...`,
      );
    } catch (error) {
      console.error("Error sending client notification:", error);
      showAlert("Error sending client notification. Check console.", "error");
    }
  };

  const fetchServerStats = async () => {
    setIsStatsLoading(true);
    try {
      const response = await fetch(`${API_URL}/sse/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        console.log("Server stats:", data);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error getting server stats:", error);
      showAlert("Error fetching server stats. Check console.", "error");
    } finally {
      setIsStatsLoading(false);
    }
  };

  const cleanupConnections = async () => {
    try {
      const response = await fetch(`${API_URL}/api/cleanup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await handleApiResponse(
        response,
        "Connections cleaned up",
      );
      if (result.success) {
        await fetchServerStats(); // Refresh stats
      }
    } catch (error) {
      console.error("Error cleaning up connections:", error);
      showAlert("Error cleaning up connections. Check console.", "error");
    }
  };

  const handleUserIdChange = (e) => {
    setUserId(e.target.value);
  };

  const handleSessionIdChange = (e) => {
    setSessionId(e.target.value);
  };

  const handleCustomMessageChange = (e) => {
    setCustomMessage(e.target.value);
  };

  const handleCustomMessageKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendCustomBroadcast();
    }
  };

  const testDatabaseConnection = async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      const result = await response.json();

      if (result.success) {
        showAlert("Database connection is healthy!", "success");
      } else {
        showAlert(`Database connection failed: ${result.error}`, "error");
      }
    } catch (error) {
      console.error("Error testing database connection:", error);
      showAlert("Error testing database connection", "error");
    }
  };

  return (
    <div className="sse-demo">
      {/* Error Banner */}
      {userFetchError && (
        <div
          className="error-banner"
          style={{
            background: "#fee",
            border: "1px solid #fcc",
            padding: "10px",
            margin: "10px 0",
            borderRadius: "4px",
            color: "#c33",
          }}
        >
          ⚠️ Database Error: {userFetchError}
          <button
            onClick={testDatabaseConnection}
            style={{ marginLeft: "10px", padding: "5px 10px" }}
          >
            Test Connection
          </button>
        </div>
      )}

      <div className="demo-grid">
        <div className="panel connection-panel">
          <h2>
            <VscDebugDisconnect /> Connection
          </h2>

          <ConnectionStatus
            status={connectionStatus}
            error={error}
            clientId={clientId}
          />

          <div className="connection-form">
            <div className="form-row">
              <label htmlFor="userId">User ID:</label>
              {availableUsers.length > 0 ? (
                <select
                  id="userId"
                  value={userId}
                  onChange={handleUserIdChange}
                  disabled={isConnected}
                >
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.id} - {user.name || user.email || `User ${user.id}`}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  id="userId"
                  value={userId}
                  onChange={handleUserIdChange}
                  placeholder="Enter user ID"
                  disabled={isConnected}
                />
              )}
            </div>

            <div className="form-row">
              <label htmlFor="sessionId">Session ID:</label>
              <input
                type="text"
                id="sessionId"
                value={sessionId}
                onChange={handleSessionIdChange}
                placeholder="Enter session ID"
                disabled={isConnected}
              />
            </div>
          </div>

          <div className="connection-controls">
            <button
              onClick={connect}
              disabled={isConnected || isConnecting}
              className="btn btn-primary"
            >
              {isConnecting ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <TbPlugConnected /> Connecting...
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <TbPlugConnected /> Connect
                </div>
              )}
            </button>

            <button
              onClick={disconnect}
              disabled={!isConnected}
              className="btn btn-danger"
            >
              <TbPlugConnectedX /> Disconnect
            </button>

            <button
              onClick={testDatabaseConnection}
              className="btn btn-secondary"
              // style={{ marginTop: '10px' }}
            >
              Test DB
            </button>
          </div>
        </div>

        <div className="panel notification-panel">
          <NotificationPanel
            onSendTest={sendTestNotification}
            onSendUser={sendUserNotification}
            onSendClient={sendClientNotification}
            onSendBroadcast={sendCustomBroadcast}
            customMessage={customMessage}
            onCustomMessageChange={handleCustomMessageChange}
            onCustomMessageKeyPress={handleCustomMessageKeyPress}
            userId={userId}
            clientId={clientId}
            isConnected={isConnected}
          />
        </div>

        <div className="panel stats-panel">
          <StatsPanel
            stats={stats}
            isLoading={isStatsLoading}
            onRefresh={fetchServerStats}
            onCleanup={cleanupConnections}
          />
        </div>
      </div>
      <div className="panel messages-panel">
        <div className="panel-header">
          <h2>
            {" "}
            <TbMessageShare /> Live Messages
          </h2>
          <div className="message-controls">
            <span className="message-count">{messages.length} messages</span>
            <button
              onClick={clearMessages}
              className="btn btn-secondary btn-sm"
            >
              <IoTrashBinOutline /> Clear
            </button>
          </div>
        </div>

        <MessageList messages={messages} />
      </div>
      {/* Debug Info */}
      {/* {process.env.NODE_ENV === 'development' && (
                <div className="debug-panel">
                    <h3>🐛 Debug Info</h3>
                    <pre>
                        {JSON.stringify({
                            connectionStatus,
                            isConnected,
                            isConnecting,
                            isError,
                            clientId,
                            messageCount: messages.length,
                            userId,
                            sessionId,
                            apiUrl: API_URL
                        }, null, 2)}
                    </pre>
                </div>
            )} */}
    </div>
  );
};

export default Home;
