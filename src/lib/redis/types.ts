//lib/redis/types.ts
import type { ScanCommandOptions, SetCommandOptions } from "@upstash/redis";

export interface RedisClient {
  // Key operations
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string | number,
    options?: SetCommandOptions,
  ): Promise<string | number | null>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;

  // Scan operations
  scan(
    cursor: string,
    options?: ScanCommandOptions,
  ): Promise<{ cursor: string; keys: string[] }>;

  // Pub/sub
  publish(channel: string, message: string): Promise<number>;

  // Hash operations
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string | number): Promise<number>;
  hdel(key: string, field: string): Promise<number>;
  hgetall(key: string): Promise<Record<string, string> | null>;
  hexists(key: string, field: string): Promise<number>;

  // List operations
  lpush(key: string, ...elements: string[]): Promise<number>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  llen(key: string): Promise<number>;
  lrem(key: string, count: number, value: string): Promise<number>;
  lpop(key: string): Promise<string | null>;
  lpop(key: string, count: number): Promise<string[] | null>;
  rpop(key: string): Promise<string | null>;
  rpop(key: string, count: number): Promise<string[] | null>;
}

export interface RedisSubscriber {
  subscribe(channel: string): Promise<number>;
  on(
    event: "message",
    callback: (channel: string, message: string) => void,
  ): void;
  unsubscribe(channel: string): Promise<number>;
  disconnect(): void;
}

export type Redis = RedisClient & Partial<RedisSubscriber>;
