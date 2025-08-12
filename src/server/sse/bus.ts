export interface EventBus {
    publish(channel: string, msg: any): Promise<void>;
    subscribe(channel: string, handler: (msg: any) => void): Promise<() => Promise<void>>;
  }
  
  // Dev/local adapter
  import { EventEmitter } from "events";
  export class InMemoryBus implements EventBus {
    private ee = new EventEmitter();
    async publish(ch: string, msg: any) { this.ee.emit(ch, msg); }
    async subscribe(ch: string, handler: (msg: any) => void) {
      const h = (m: unknown) => { try { handler(m); } catch {} };
      this.ee.on(ch, h);
      return async () => { this.ee.off(ch, h); };
    }
  }
  
  // Redis adapter (wire later if you run multiple instances)
  export class RedisBus implements EventBus {
    constructor(private sub: any, private pub: any) {}
    async publish(ch: string, msg: any) {
      await this.pub.publish(ch, JSON.stringify(msg));
    }
    async subscribe(ch: string, handler: (msg: any) => void) {
      const onMessage = (channel: string, payload: string) => {
        if (channel !== ch) return;
        try { handler(JSON.parse(payload)); } catch {}
      };
      await this.sub.subscribe(ch);
      this.sub.on("message", onMessage);
      return async () => { this.sub.off("message", onMessage); await this.sub.unsubscribe(ch); };
    }
  }
  