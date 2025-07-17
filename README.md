# Nomey Web App

This is the official repository for the Nomey web app, built on the T3 Stack with custom extensions.

## Tech Stack

- [Next.js](https://nextjs.org) - App Framework
- [NextAuth.js](https://next-auth.js.org) - Authentication
- [Prisma](https://prisma.io) - Database ORM
- [Tailwind CSS](https://tailwindcss.com) - CSS Utility Framework
- [tRPC](https://trpc.io) - API Framework
- [Mux]() - Video handling (upload / storage / etc.)
- [tolgee](https://tolgee.io/) - Translation Management
- [Meilisearch](https://www.meilisearch.com/) - Full-text search
- [Upstash](https://upstash.com/) Next compatible redis
- [Qstash](https://upstash.com/docs/qstash) Next compatible queue handling
- [Vitest](https://vitest.dev/) - Testing Framework
- **Server-Sent Events (SSE)** - Real-time server-to-client notifications

## Server-Sent Events (SSE)

This application includes a comprehensive Server-Sent Events (SSE) implementation for real-time, server-to-client notifications. SSE enables the server to push updates to connected clients instantly without requiring page refreshes or polling.

### Features

- **Centralized SSE Manager** - Tracks active client connections and manages lifecycle
- **Event Broadcasting** - Send events to all clients, specific users, sessions, or individual clients
- **Heartbeat Mechanism** - Keeps connections alive with periodic ping messages
- **Automatic Cleanup** - Properly handles client disconnects and resource cleanup
- **React Hooks** - Easy-to-use hooks for frontend integration
- **Backend Utilities** - Simple API for sending notifications from any backend service
- **Error Handling** - Comprehensive error handling and logging throughout

### Quick Start

1. **Frontend**: Use the `useSSE` hook to connect and receive events
2. **Backend**: Use utility functions like `broadcastSSEMessage()` to send notifications
3. **Demo**: Visit the SSE Demo page to see all features in action

📖 **For detailed documentation, code examples, and API reference, see [SSE Documentation](./docs/SSE.md)**

## Testing

This project uses [Vitest](https://vitest.dev/) to run both client-side (browser) and server-side (Node.js) tests.

### Project Structure

Tests are split into two environments:

- **Browser (jsdom)** — for React/browser environment tests.
- **Node.js** — for backend and server-only logic.

### File Naming Conventions

- Node-specific tests: `*.node.test.ts`
- Browser tests: any other `*.test.ts`, `*.test.tsx`, etc.

### Running Tests

Run **all tests**:

```bash
npm run test
```

## Local Development

### Clone and Install

```bash
git clone git@github.com:nomeyy/nomey-next.git
cd nomey-next
npm install
```

### Run Containers

You'll need to have `docker` installed locally. We advise running `./scripts/start-services.sh` to safely start your environment, but a normal docker workflow will also work.

### Run Next

```bash
npm run dev
```

### Test SSE Functionality

1. Start the development server
2. Open http://localhost:3000
3. Navigate to the SSE Demo page
4. Watch for the automatic welcome notification
5. Try sending test messages and notifications
6. Test the "Try Demo" button for instant feedback

> ⚠️ **Warning:** The T3 stack hard-enforces environment variables to provide type-safety. The project will not build without all environment variables in place. Contact a dev to get their variables to quickly get yourself up and running.

## Learn More

- [Nomey Documentation (WIP)](https://nomey.mintlify.app/)
- [Next Documentation](https://nextjs.org/docs)
- [T3 Stack Documentation](https://create.t3.gg/en/usage/first-steps)
- [Mux Documentation](https://www.mux.com/docs)
- [Server-Sent Events MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
