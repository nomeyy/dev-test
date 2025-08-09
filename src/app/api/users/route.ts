import { PrismaClient } from "@prisma/client";
import { sseManager } from "@/lib/sse";

const prisma = new PrismaClient();

export async function GET() {
  const activeUserIds = sseManager.getActiveUsers();

  const users = await prisma.user.findMany({
    select: { id: true, name: true },
  });

  const usersWithStatus = users.map((user) => ({
    ...user,
    is_connected: activeUserIds.some(
      (activeUser) => activeUser.userId === user.id,
    ),
  }));

  return new Response(JSON.stringify(usersWithStatus), { status: 200 });
}
