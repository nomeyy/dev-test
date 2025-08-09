export type Client = {
  id: string;
  name: string;
  userId?: string;
  res: WritableStreamDefaultWriter;
  status: "connected" | "disconnected";
  subscriptions: Set<string>;
};
