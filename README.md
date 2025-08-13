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

> ⚠️ **Warning:** The T3 stack hard-enforces environment variables to provide type-safety. The project will not build without all environment variables in place. Contact a dev to get their variables to quickly get yourself up and running.

## Learn More

- [Nomey Documentation (WIP)](https://nomey.mintlify.app/)
- [Next Documentation](https://nextjs.org/docs)
- [T3 Stack Documentation](https://create.t3.gg/en/usage/first-steps)
- [Mux Documentation](https://www.mux.com/docs)

## Getting Started Guide

### Prerequisites

- Node.js >= 20.17 and npm >= 10 (see `package.json` engines)
- Docker (for Postgres, Meilisearch, Tolgee via `scripts/start-services.sh`)

### Environment Variables

Create a `.env.local` in the project root. Minimum to run locally:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nomey?schema=public"

# NextAuth (Discord)
AUTH_SECRET="replace-with-strong-random"
AUTH_DISCORD_ID="your-discord-client-id"
AUTH_DISCORD_SECRET="your-discord-client-secret"

# SSE security
JWT_SECRET="replace-with-strong-random"
ADMIN_TRIGGER_TOKEN="replace-with-strong-admin-token"

# Optional integrations (enable features as needed)
MUX_TOKEN_ID="..."
MUX_TOKEN_SECRET="..."
MUX_SIGNING_KEY_ID="..."
MUX_SIGNING_KEY_SECRET="..."
MUX_VIDEO_QUALITY="basic" # or plus|premium
MUX_WEBHOOK_SECRET="..."

MEILISEARCH_HOST="http://localhost:7700"
MEILISEARCH_API_KEY="masterKey"

RESEND_API_KEY="..."
RESEND_FROM_EMAIL="Your Name <no-reply@example.com>"
RESEND_TO_DEV_ADDRESS="developer@example.com"

TOLGEE_API_KEY="..."

UPSTASH_REDIS_REST_URL="..." # optional
UPSTASH_REDIS_REST_TOKEN="..." # optional
```

> Tip: In a pinch, you can run with `SKIP_ENV_VALIDATION=1` for builds, but prefer setting the variables above for a complete experience.

### Start Local Services (Docker)

```bash
./scripts/start-services.sh
```

This brings up Postgres, Meilisearch, and Tolgee based on your env file.

### Database Setup

```bash
# Generate client and apply schema
npm run db:push

# Seed demo users (alice/bob/etc with password "password123")
npm run seed
```

### Run the App

```bash
npm run dev
```

Visit `http://localhost:3000`.

### Quick SSE Test

1. On the home page, log in using a seeded user:
   - `alice@example.com` / `password123`
2. Click “Connect SSE”. You should see a "connected" event appear.
3. In a separate terminal, send an event (replace token and port if changed):

```bash
curl -X POST http://localhost:3000/api/sse/trigger \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TRIGGER_TOKEN" \
  -d '{
    "eventName": "notification",
    "payload": {"message": "Hello, Alice!"},
    "userId": "<alice-user-id>"
  }'
```

- To broadcast to all connected clients, omit `userId` in the payload.
- The UI should display the new event immediately.

> You can get `userId` from the login response JSON or your database (`prisma studio`):

```bash
npm run db:studio
```

### NextAuth (Discord) Login (optional)

- Create a Discord OAuth application and set callback to `http://localhost:3000/api/auth/callback/discord`.
- Fill `AUTH_DISCORD_ID` and `AUTH_DISCORD_SECRET` in `.env.local` and restart dev server.

### Testing

```bash
npm run test
```

- Browser tests run under `jsdom`.
- Node tests run separately and load env via `@next/env`.

### Troubleshooting

- Build blocked by env validation: Ensure all required vars in `src/env.js` are present or temporarily set `SKIP_ENV_VALIDATION=1` when running `next build`.
- Database connection errors: Verify Postgres is up (`./scripts/start-services.sh`) and `DATABASE_URL` matches container ports.
- Rate limiting/Redis: If Upstash envs are unset, requests are allowed with a warning; set `UPSTASH_REDIS_*` for production-like behavior.
- SSE behind proxies: Ensure proxies do not buffer SSE (e.g., disable response buffering) and allow keep-alive connections.

### Production Notes

- Set strong values for `AUTH_SECRET`, `JWT_SECRET`, and `ADMIN_TRIGGER_TOKEN`.
- The SSE manager stores connections in-memory; for multiple instances or serverless, add a pub/sub layer (e.g., Redis) and a fan-out process.
- Configure reverse proxies/load balancers for long-lived connections (timeouts, no buffering for `text/event-stream`).
- Prefer a single Prisma client factory across the codebase; the project currently has both `src/lib/db.ts` and `src/lib/prisma.ts` patterns.

### Testing with Postman

You can send messages or broadcasts to the `POST /api/sse/trigger` endpoint directly from Postman.

#### 1) Broadcast to all connected users

- **Method**: POST
- **URL**: `http://localhost:3000/api/sse/trigger`
- **Headers**:
  - `x-admin-token: admintoken`
  - `Content-Type: application/json`
- **Body (raw JSON)**:

```json
{
  "eventName": "new-message",
  "payload": { "text": "Hello everyone!" }
}
```

This will call `broadcast()` and send the `new-message` event to all connected SSE clients.

#### 2) Send to a single user

- **Method**: POST
- **URL**: `http://localhost:3000/api/sse/trigger`
- **Headers**:
  - `x-admin-token: admintoken`
  - `Content-Type: application/json`
- **Body (raw JSON)**:

```json
{
  "userId": "cme83hoir0000zwtr4vrqgnbi",
  "eventName": "private-message",
  "payload": { "text": "Hey! This is just for you." }
}
```

This will call `sendEventToUser()` and send the `private-message` event only to that connected user.

#### Important notes

- **x-admin-token**: Must match your `ADMIN_TRIGGER_TOKEN` in `.env` (defaults to `admintoken` in code if not set; set a strong token).
- **userId**: Must match the user ID stored when the client connected (e.g., from your database or login response).
- **eventName**: Custom event name. Ensure the client listens for the same event type via `EventSource.addEventListener(eventName, ...)`.
