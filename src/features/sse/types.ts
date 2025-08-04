export type SSEClient = {
  id: string; // userId, sessionId, or random
  res: NodeJS.WritableStream;
};

export type SSEEvent = {
  event: string;
  data: any;
};
