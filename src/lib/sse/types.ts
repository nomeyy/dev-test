export type SSEClient = {
  write: (chunk: string) => Promise<void>;
  end: () => Promise<void>;
};
export interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "success" | "error" | "data";
}
