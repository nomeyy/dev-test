'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { useSSEOperations } from '../hooks/useSSEOperations';

export function SSEDashboard() {
  const [customMessage, setCustomMessage] = useState('Hello from SSE Demo!');
  const { sendMessage, broadcastMessage, activeClients, isSending } = useSSEOperations();
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [broadcastToAll, setBroadcastToAll] = useState<string>('off');

  const sendTestMessage = async () => {
    try {
      sendMessage(selectedClientId, customMessage);
    } catch (error) {
      console.error('Error sending test message:', error);
    }
  };

  const broadcastMessageToClients = async () => {
    try {
      broadcastMessage(customMessage);
    } catch (error) {
      console.error('Error sending test message:', error);
    } finally {
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">SSE Dashboard</h1>

      <div className="mb-6 p-4 border rounded-lg bg-white shadow-sm">
        <h2 className="text-xl font-semibold mb-3 text-gray-900">Active Clients</h2>
        {activeClients && activeClients.length > 0 ? (
          <ul className="space-y-2">
            {activeClients.map((clientId, key) => (
              <li key={clientId} className="flex items-center gap-2">
                <input
                  type="radio"
                  id={`client-${clientId}`}
                  name="selectedClient"
                  value={clientId}
                  checked={selectedClientId === clientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value)
                    setBroadcastToAll('off');
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label
                  htmlFor={`client-${clientId}`}
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  Client {key + 1} (Id: {clientId})
                </label>
              </li>
            ))}
            <li className="flex items-center gap-2">
              <input
                type="radio"
                id="broadcast-all"
                name="selectedClient"
                checked={broadcastToAll === 'on'}
                onChange={(e) => {
                  debugger
                  setBroadcastToAll(e.target.value);
                  setSelectedClientId('');
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <label
                htmlFor="broadcast-all"
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                Broadcast to all clients
              </label>
            </li>
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">No active clients connected</p>
        )}
      </div>
      <div className="mb-6 p-4 border rounded-lg bg-white shadow-sm">
        <h2 className="text-xl font-semibold mb-3 text-gray-900">Test Controls</h2>
        <div className="mb-4">
          <label htmlFor="customMessage" className="block text-sm font-medium text-gray-700 mb-2">
            Custom Message
          </label>
          <div className="flex gap-2">
            <input
              id="customMessage"
              type="text"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Enter your message here..."
              className="flex-1 text-black px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            />
            <Button
              onClick={sendTestMessage}
              variant="default"
              className="text-base"
            >
              {'Send Message'}
            </Button>
            <Button
              onClick={broadcastMessageToClients}
              variant="default"
              className="text-base"
              disabled={broadcastToAll === 'off'}
            >
              {isSending ? 'Sending...' : 'Broadcast'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 