import { ChangeDetectorRef, Injectable, NgZone } from '@angular/core';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

type SocketMessage = {
  type?: string;
  [key: string]: unknown;
};

@Injectable({ providedIn: 'root' })
export class SocketService {
  status: ConnectionStatus = 'disconnected';

  private socket?: WebSocket;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectAttempts = 0;
  private manuallyDisconnected = false;
  private currentName = '';
  private readonly handlers: Array<(data: SocketMessage) => void> = [];
  private readonly changeDetectors: ChangeDetectorRef[] = [];

  constructor(private readonly zone: NgZone) {}

  connect(name: string): void {
    const trimmed = name.trim();
    if (!trimmed || this.status === 'connected' || this.status === 'connecting') {
      return;
    }

    this.currentName = trimmed;
    this.manuallyDisconnected = false;
    this.openSocket();
  }

  disconnect(): void {
    this.manuallyDisconnected = true;
    this.clearReconnectTimer();
    this.socket?.close();
    this.socket = undefined;
    this.status = 'disconnected';
  }

  send(payload: unknown): void {
    if (!this.socket || this.socket.readyState !== this.socket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify(payload));
  }

  subscribe(handler: (data: SocketMessage) => void): void {
    this.handlers.push(handler);
  }

  registerChangeDetector(ref: ChangeDetectorRef): void {
    this.changeDetectors.push(ref);
  }

  private openSocket(): void {
    this.status = 'connecting';

    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${location.host}`;

    const socket = new WebSocket(wsUrl);
    this.socket = socket;

    socket.addEventListener('open', () => {
      this.zone.run(() => {
        this.status = 'connected';
        this.reconnectAttempts = 0;
        socket.send(JSON.stringify({ type: 'join', name: this.currentName }));
        this.notifyChange();
      });
    });

    socket.addEventListener('message', (event) => {
      this.zone.run(() => {
        try {
          const data = JSON.parse(event.data) as SocketMessage;
          for (const handler of this.handlers) {
            handler(data);
          }
          this.notifyChange();
        } catch {
          // Ignore malformed messages
        }
      });
    });

    socket.addEventListener('close', () => {
      this.zone.run(() => {
        if (this.manuallyDisconnected) {
          this.status = 'disconnected';
          this.notifyChange();
          return;
        }

        this.status = 'disconnected';
        this.scheduleReconnect();
        this.notifyChange();
      });
    });

    socket.addEventListener('error', () => {
      this.zone.run(() => {
        this.status = 'error';
        this.notifyChange();
      });
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || !this.currentName.trim()) {
      return;
    }

    const delay = Math.min(10000, 1000 * Math.max(1, this.reconnectAttempts + 1));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      if (this.manuallyDisconnected) {
        return;
      }
      this.reconnectAttempts += 1;
      this.openSocket();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  private notifyChange(): void {
    for (const ref of this.changeDetectors) {
      ref.detectChanges();
    }
  }
}
