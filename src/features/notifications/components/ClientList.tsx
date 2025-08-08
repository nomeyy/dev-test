import { Button } from "@/shared/components/ui/button";
import type { Client } from "../hooks/useSSEConnection";

function ClientList({
  clients,
  currentUserId,
  currentUserName,
  onSend,
  disabled,
}: {
  clients: Client[];
  currentUserId?: string;
  currentUserName?: string;
  onSend: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700">
        Connected Users ({clients.length})
      </h3>
      {clients.length === 0 ? (
        <p className="text-gray-500">No users connected...</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {clients.map((client) => (
            <li
              key={client.id}
              className="flex items-center gap-2 rounded bg-white p-2 text-sm text-gray-600 shadow-sm"
            >
              <span>
                {client.id === currentUserId
                  ? `${currentUserName} (You)`
                  : client.name}
              </span>
              {client.id !== currentUserId && (
                <Button
                  size="sm"
                  onClick={() => onSend(client.id)}
                  disabled={disabled}
                >
                  Send
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ClientList;
