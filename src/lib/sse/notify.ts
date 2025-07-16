import { sseManager } from "./manager";

export const notifyAll = (event: string, data: unknown) => {
  sseManager.broadcast(event, data);
};

export const notifyClient = (
  clientId: string,
  event: string,
  data: unknown,
) => {
  sseManager.send(clientId, event, data);
};
