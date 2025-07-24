import { PrismaClient } from "@prisma/client";
import type { SSEConnection } from "@prisma/client";

const prisma = new PrismaClient();

export async function createSSEConnection(data: {
  clientId: string;
  userId: string;
  sessionId: string;
  state: string;
  lastHeartbeat: Date;
}) {
  return prisma.sSEConnection.create({
    data: {
      clientId: data.clientId,
      userId: data.userId,
      sessionId: data.sessionId,
      state: data.state,
      lastHeartbeat: data.lastHeartbeat,
    },
  });
}

export async function updateSSEConnection(
  clientId: string,
  data: Partial<SSEConnection>,
) {
  return prisma.sSEConnection.update({
    where: { clientId },
    data,
  });
}

export async function deleteSSEConnection(clientId: string) {
  return prisma.sSEConnection.delete({
    where: { clientId },
  });
}

export async function getActiveSSEConnections() {
  return prisma.sSEConnection.findMany({
    where: { state: "connected" },
  });
}

export async function getSSEConnectionsByUser(userId: string) {
  return prisma.sSEConnection.findMany({
    where: { userId, state: "connected" },
  });
}

export async function cleanupStaleSSEConnections(timeoutMs: number) {
  const cutoff = new Date(Date.now() - timeoutMs);
  // Option 1: Delete stale connections
  return prisma.sSEConnection.deleteMany({
    where: {
      lastHeartbeat: { lt: cutoff },
      state: "connected",
    },
  });
  // Option 2: Alternatively, you could update state to 'disconnected' instead of deleting
  // return prisma.sSEConnection.updateMany({
  //   where: { lastHeartbeat: { lt: cutoff }, state: "connected" },
  //   data: { state: "disconnected" },
  // });
}
