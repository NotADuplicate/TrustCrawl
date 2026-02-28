import { describe, expect, it, vi } from 'vitest';
import { NgZone } from '@angular/core';
import { InventoryService } from '../client/src/app/services/inventory.service';
import { SocketService } from '../client/src/app/services/socket.service';

type MessageHandler = (data: { [key: string]: unknown }) => void;

class FakeStorage {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  readonly OPEN = 1;
  readyState = this.OPEN;
  sent: string[] = [];
  private readonly listeners = new Map<string, Array<(...args: unknown[]) => void>>();

  constructor(public readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: (...args: unknown[]) => void): void {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  send(payload: string): void {
    this.sent.push(payload);
  }

  close(): void {
    this.emit('close');
  }

  emit(type: string, event?: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }

  static reset(): void {
    FakeWebSocket.instances = [];
  }
}

function createMockSocketDependency() {
  let handler: MessageHandler | undefined;

  return {
    instance: {
      status: 'disconnected',
      connect: vi.fn(),
      disconnect: vi.fn(),
      send: vi.fn(),
      subscribe(callback: MessageHandler) {
        handler = callback;
      },
    },
    emit(data: { [key: string]: unknown }) {
      if (!handler) {
        throw new Error('Socket subscriber was not registered.');
      }

      handler(data);
    },
  };
}

describe('connection behavior', () => {
  it('loads the saved name without auto-connecting on startup', () => {
    const storage = new FakeStorage();
    storage.setItem('trust-crawl-name', 'Alice');

    const originalStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
    });

    const mockSocket = createMockSocketDependency();

    const service = new InventoryService(mockSocket.instance as never);

    expect(service.state.name).toBe('Alice');
    expect(mockSocket.instance.connect).not.toHaveBeenCalled();

    Object.defineProperty(globalThis, 'localStorage', {
      value: originalStorage,
      configurable: true,
    });
  });

  it('does not automatically reconnect after an unexpected socket close', () => {
    FakeWebSocket.reset();

    const originalWebSocket = globalThis.WebSocket;
    const originalLocation = globalThis.location;

    Object.defineProperty(globalThis, 'WebSocket', {
      value: FakeWebSocket,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'location', {
      value: { protocol: 'http:', host: 'localhost:6970' },
      configurable: true,
    });

    const zone = {
      run(fn: () => void) {
        fn();
      },
    } as NgZone;

    const service = new SocketService(zone);
    service.connect('Alice');

    expect(FakeWebSocket.instances).toHaveLength(1);

    const socket = FakeWebSocket.instances[0];
    socket.emit('open');
    expect(service.status).toBe('connected');
    expect(socket.sent).toContain(JSON.stringify({ type: 'join', name: 'Alice' }));

    socket.emit('close');

    expect(service.status).toBe('disconnected');
    expect(FakeWebSocket.instances).toHaveLength(1);

    Object.defineProperty(globalThis, 'WebSocket', {
      value: originalWebSocket,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'location', {
      value: originalLocation,
      configurable: true,
    });
  });
});
