# SSEManager – Real-Time Event System with Heartbeat Monitoring

## 🛠️ About

SSEManager provides a flexible API endpoint at `/api/notify` for handling real-time, event-driven communication using Server-Sent Events (SSE). The endpoint accepts a payload and an `eventType` (e.g., `"notification"`, `"ping"`) to support various use cases.

It also includes a built-in **heartbeat system** for monitoring the connection status of clients in real time.

### Core Features

- **`addClient`** – Registers a new client connection.
- **`removeClient`** – Cleans up resources when a client disconnects.
- **`sendEvent`** – Sends a custom event to a specific client.
- **`broadcast`** – Sends an event to all connected clients.

---

## 📦 Getting Started

To set up the project, install the required dependencies:

```bash
npm install
