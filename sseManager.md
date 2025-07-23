# SSEManager – Real-Time Event System with Heartbeat

## Description of Changes

Implemented a reusable API endpoint at `/api/notify` which accepts a payload and an `eventType` (e.g., `"notification"`, `"ping"`) to handle various types of event-driven communication.

Added real-time **heartbeat** functionality to monitor the status of connected clients. This includes:

- **`addClient`**: Registers a new client connection.
- **`removeClient`**: Handles cleanup when a client disconnects.
- **`sendEvent`**: Sends a targeted event to a specific client.
- **`broadcast`**: Sends events to all connected clients simultaneously.

---

## 📦 Setup

Install dependencies before running the app:

```bash
npm install
