'use client';

import { api } from '@/trpc/react';

interface UseSSEOperationsInterface {
  activeClients: string[] | undefined;
  sendMessage: (clientId: string, message: string) => void;
  broadcastMessage: (message: string) => void
  isSending: boolean
}

export function useSSEOperations(): UseSSEOperationsInterface {
  const sender = api.sse.sendMessage.useMutation();
  const broadcaster = api.sse.broadcastMessage.useMutation();
  const activeClientsQuery = api.sse.activeClients.useQuery(undefined, {
    refetchInterval: 10000, // 10 seconds
  });

  const sendMessage = (clientId: string, message: string) => {
    return sender.mutate({
      clientId,
      message,
    });
  }
  const broadcastMessage = (message: string) => {
    return broadcaster.mutate({
      message,
    });
  }

  return {
    activeClients: activeClientsQuery.data?.map((item) => item.id),
    sendMessage,
    broadcastMessage,
    isSending: sender.isPending || broadcaster.isPending,
  }
} 