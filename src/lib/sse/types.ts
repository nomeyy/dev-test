import type { Session } from "next-auth";

export interface SSEEvent {
  type: string;
  payload: unknown;
}

export interface SSEClient {
  response: Response;
  stream: ReadableStream;
}

// Extract the User type from NextAuth Session
export type User = Session["user"];

// Represents an SSE client with its stream controller + user info
export type Client = {
  controller: ReadableStreamDefaultController;
} & User;
