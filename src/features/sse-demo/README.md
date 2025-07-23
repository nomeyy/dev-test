# SSE Manager Usage

## Overview

This module provides a reusable Server-Sent Events (SSE) manager for real-time server-to-client notifications.

## How to Use

### 1. Connect from the client

Fetch from `/api/sse-demo?id=USER_ID` (or session id). The connection will stay open for events.

### 2. Send events from backend

Import `sseManager` and use:

```ts
import { sseManager } from "src/features/sse-demo/manager";

// Send to a specific client
sseManager.sendEvent("USER_ID", "eventName", { foo: "bar" });

// Broadcast to all
sseManager.broadcast("eventName", { foo: "bar" });
```

### 3. Heartbeat

A ping event is sent every 25s to keep connections alive.

### 4. Cleanup

Clients are removed on disconnect automatically.

## Example

See `/src/pages/api/sse.ts` for the API route.

---

**Note:** You can extend the manager to support authentication, custom event types, etc.
