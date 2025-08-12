import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SSEManager } from '../services/sse-manager';

describe('SSEManager', () => {
  let manager: SSEManager;

  beforeEach(() => {
    manager = new SSEManager({
      heartbeatInterval: 100, // Fast for testing
      cleanupInterval: 100,
      maxConnections: 10,
      connectionTimeout: 1000,
    });
  });

  afterEach(() => {
    manager.destroy();
  });

  it('should register a client successfully', () => {
    const sendFn = vi.fn();
    const closeFn = vi.fn();
    
    const client = manager.registerClient('client1', sendFn, closeFn, {
      userId: 'user1',
      sessionId: 'session1',
    });

    expect(client.id).toBe('client1');
    expect(client.userId).toBe('user1');
    expect(client.sessionId).toBe('session1');
    expect(client.isAlive).toBe(true);
  });

  it('should remove a client successfully', () => {
    const sendFn = vi.fn();
    const closeFn = vi.fn();
    
    manager.registerClient('client1', sendFn, closeFn);
    const removed = manager.removeClient('client1');
    
    expect(removed).toBe(true);
    expect(manager.getActiveClients()).toHaveLength(0);
  });

  it('should send events to specific clients', () => {
    const sendFn1 = vi.fn();
    const sendFn2 = vi.fn();
    const closeFn = vi.fn();
    
    manager.registerClient('client1', sendFn1, closeFn, { userId: 'user1' });
    manager.registerClient('client2', sendFn2, closeFn, { userId: 'user2' });

    const event = {
      event: 'test',
      data: { message: 'Hello' },
      timestamp: new Date(),
    };

    const sentCount = manager.sendEvent(event, { userId: 'user1' });
    
    expect(sentCount).toBe(1);
    expect(sendFn1).toHaveBeenCalledWith(expect.stringContaining('event: test'));
    expect(sendFn2).not.toHaveBeenCalled();
  });

  it('should broadcast events to all clients', () => {
    const sendFn1 = vi.fn();
    const sendFn2 = vi.fn();
    const closeFn = vi.fn();
    
    manager.registerClient('client1', sendFn1, closeFn);
    manager.registerClient('client2', sendFn2, closeFn);

    const event = {
      event: 'broadcast',
      data: { message: 'Hello everyone' },
      timestamp: new Date(),
    };

    const sentCount = manager.broadcast(event);
    
    expect(sentCount).toBe(2);
    expect(sendFn1).toHaveBeenCalledWith(expect.stringContaining('event: broadcast'));
    expect(sendFn2).toHaveBeenCalledWith(expect.stringContaining('event: broadcast'));
  });

  it('should track user connections correctly', () => {
    const sendFn = vi.fn();
    const closeFn = vi.fn();
    
    manager.registerClient('client1', sendFn, closeFn, { userId: 'user1' });
    manager.registerClient('client2', sendFn, closeFn, { userId: 'user1' });

    expect(manager.getClientCountByUser('user1')).toBe(2);
    expect(manager.getClientCountByUser('user2')).toBe(0);
  });

  it('should track session connections correctly', () => {
    const sendFn = vi.fn();
    const closeFn = vi.fn();
    
    manager.registerClient('client1', sendFn, closeFn, { sessionId: 'session1' });
    manager.registerClient('client2', sendFn, closeFn, { sessionId: 'session1' });

    expect(manager.getClientCountBySession('session1')).toBe(2);
    expect(manager.getClientCountBySession('session2')).toBe(0);
  });

  it('should respect max connections limit', () => {
    const sendFn = vi.fn();
    const closeFn = vi.fn();
    
    // Try to register more clients than the limit
    for (let i = 0; i < 10; i++) {
      manager.registerClient(`client${i}`, sendFn, closeFn);
    }

    expect(() => {
      manager.registerClient('client11', sendFn, closeFn);
    }).toThrow('Maximum connections reached');
  });

  it('should provide accurate metrics', () => {
    const sendFn = vi.fn();
    const closeFn = vi.fn();
    
    manager.registerClient('client1', sendFn, closeFn);
    manager.registerClient('client2', sendFn, closeFn);

    const metrics = manager.getMetrics();
    
    expect(metrics.totalConnections).toBe(2);
    expect(metrics.activeConnections).toBe(2);
    expect(metrics.totalEventsSent).toBe(0);
  });

  it('should emit events for client lifecycle', () => {
    const onConnect = vi.fn();
    const onDisconnect = vi.fn();
    
    manager.on('clientConnected', onConnect);
    manager.on('clientDisconnected', onDisconnect);

    const sendFn = vi.fn();
    const closeFn = vi.fn();
    
    const client = manager.registerClient('client1', sendFn, closeFn);
    expect(onConnect).toHaveBeenCalledWith(client);

    manager.removeClient('client1');
    expect(onDisconnect).toHaveBeenCalledWith('client1', 'disconnected');
  });
});
