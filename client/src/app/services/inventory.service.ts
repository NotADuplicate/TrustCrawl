import { Injectable } from '@angular/core';
import { SocketService, type ConnectionStatus } from './socket.service';

export type GameItem = {
  name: string;
  description: string;
  weight: number;
  usable?: boolean;
};

export type StackedItem = GameItem & {
  quantity: number;
};

export type PlayerState = {
  name: string;
  health: number;
  stamina: number;
  wellFed?: boolean;
  inventory: GameItem[];
};

export type InventoryState = {
  name: string;
  players: string[];
  isHost: boolean;
  gameStarted: boolean;
  gamePlayers: PlayerState[];
  floorItems: GameItem[];
  level: number;
  isDemon: boolean;
  showDemonModal: boolean;
  itemOptionActive: boolean;
  itemOptionItemName: string | null;
  itemOptionChoices: string[];
};

@Injectable({ providedIn: 'root' })
export class InventoryService {
  readonly state: InventoryState = {
    name: '',
    players: [],
    isHost: false,
    gameStarted: false,
    gamePlayers: [],
    floorItems: [],
    level: 1,
    isDemon: false,
    showDemonModal: false,
    itemOptionActive: false,
    itemOptionItemName: null,
    itemOptionChoices: [],
  };

  private readonly storageKey = 'trust-crawl-name';
  private readonly demonDismissedKeyPrefix = 'trust-crawl-demon-dismissed';
  private demonModalDismissed = false;
  private readonly gameStartListeners: Array<() => void> = [];

  constructor(private readonly socket: SocketService) {
    this.socket.subscribe((data) => {
      if (data.type === 'state' && Array.isArray(data['players'])) {
        const startedNow = Boolean(data['gameStarted']);
        const wasStarted = this.state.gameStarted;
        this.state.players = data['players'] as string[];
        this.state.isHost = Boolean(data['isHost']);
        this.state.gameStarted = startedNow;

        if (startedNow && !wasStarted) {
          for (const listener of this.gameStartListeners) {
            listener();
          }
        }
      }

      if (data.type === 'game' && Array.isArray(data['players']) && Array.isArray(data['floor'])) {
        this.state.gameStarted = true;
        this.state.gamePlayers = data['players'] as PlayerState[];
        this.state.floorItems = data['floor'] as GameItem[];
        this.state.level = typeof data['level'] === 'number' ? data['level'] : this.state.level;
        this.state.isDemon = Boolean(data['isDemon']);
        const shouldShow = this.state.isDemon && !this.demonModalDismissed;
        this.state.showDemonModal = shouldShow;
      }

      if (data.type === 'item-options') {
        this.state.itemOptionActive = true;
        this.state.itemOptionItemName = typeof data['itemName'] === 'string' ? data['itemName'] : null;
        this.state.itemOptionChoices = Array.isArray(data['options']) ? (data['options'] as string[]) : [];
        console.log(`Received options for ${this.state.itemOptionItemName}: ${this.state.itemOptionChoices.join(', ')}`);
      }
    });

    if (typeof localStorage !== 'undefined') {
      const savedName = localStorage.getItem(this.storageKey);
      if (savedName) {
        this.state.name = savedName;
        const dismissedKey = this.getDemonDismissedKey(savedName);
        this.demonModalDismissed = localStorage.getItem(dismissedKey) === 'true';
        this.connect();
      }
    }
  }

  get status(): ConnectionStatus {
    return this.socket.status;
  }

  get connected(): boolean {
    return this.socket.status === 'connected';
  }

  get otherPlayers(): string[] {
    const selfName = this.state.name.trim();
    return this.state.players.filter((player) => player !== selfName);
  }

  get otherPlayersHealth(): PlayerState[] {
    const selfName = this.state.name.trim();
    return this.state.gamePlayers.filter((entry) => entry.name !== selfName);
  }

  get myInventory(): GameItem[] {
    const selfName = this.state.name.trim();
    const player = this.state.gamePlayers.find((entry) => entry.name === selfName);
    return player?.inventory ?? [];
  }

  get myInventoryStacked(): StackedItem[] {
    const items = this.myInventory;
    const byName = new Map<string, StackedItem>();
    for (const item of items) {
      const existing = byName.get(item.name);
      if (existing) {
        existing.quantity += 1;
        continue;
      }

      byName.set(item.name, {
        ...item,
        quantity: 1,
      });
    }

    return Array.from(byName.values());
  }

  get myInventoryWeight(): number {
    return this.myInventory.reduce((total, item) => total + (item.weight ?? 0), 0);
  }

  get myFoodCount(): number {
    return this.myInventory.filter((item) => item.name.toLowerCase() === 'food').length;
  }

  get myHealth(): number {
    const selfName = this.state.name.trim();
    const player = this.state.gamePlayers.find((entry) => entry.name === selfName);
    return player?.health ?? 0;
  }

  get myStamina(): number {
    const selfName = this.state.name.trim();
    const player = this.state.gamePlayers.find((entry) => entry.name === selfName);
    return player?.stamina ?? 0;
  }

  get myWellFed(): boolean {
    const selfName = this.state.name.trim();
    const player = this.state.gamePlayers.find((entry) => entry.name === selfName);
    return Boolean(player?.wellFed);
  }

  updateName(name: string): void {
    this.state.name = name;
  }

  connect(): void {
    if (!this.state.name.trim() || this.connected) {
      return;
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, this.state.name.trim());
      const dismissedKey = this.getDemonDismissedKey(this.state.name.trim());
      this.demonModalDismissed = localStorage.getItem(dismissedKey) === 'true';
    }

    this.socket.connect(this.state.name.trim());
  }

  disconnect(): void {
    this.socket.disconnect();
    this.resetState(true);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }

  startGame(): void {
    if (!this.connected || !this.state.isHost || this.state.gameStarted) {
      return;
    }

    this.socket.send({ type: 'start' });
  }

  moveToFloor(itemName: string): void {
    if (!itemName || !this.connected || !this.state.gameStarted) {
      return;
    }

    this.socket.send({ type: 'moveToFloor', itemName });
  }

  moveToInventory(itemName: string): void {
    if (!itemName || !this.connected || !this.state.gameStarted) {
      return;
    }

    this.socket.send({ type: 'moveToInventory', itemName });
  }

  useItem(itemName: string): void {
    if (!itemName || !this.connected || !this.state.gameStarted) {
      return;
    }

    this.socket.send({ type: 'useItem', itemName });
  }

  useItemWithOption(itemName: string, optionIndex: number): void {
    if (!itemName || !this.connected || !this.state.gameStarted) {
      return;
    }

    this.socket.send({ type: 'useItemOption', itemName, optionIndex });
    this.clearItemOptions();
  }

  clearItemOptions(): void {
    console.log('Clearing item options.');
    this.state.itemOptionActive = false;
    this.state.itemOptionItemName = null;
    this.state.itemOptionChoices = [];
  }

  dismissDemonModal(): void {
    this.state.showDemonModal = false;
    this.demonModalDismissed = true;
    if (typeof localStorage !== 'undefined') {
      const dismissedKey = this.getDemonDismissedKey(this.state.name.trim());
      if (dismissedKey) {
        localStorage.setItem(dismissedKey, 'true');
      }
    }
  }

  onGameStarted(listener: () => void): void {
    this.gameStartListeners.push(listener);
  }

  private getDemonDismissedKey(name: string): string {
    if (!name.trim()) {
      return '';
    }
    return `${this.demonDismissedKeyPrefix}:${name.trim()}`;
  }

  private resetState(clearName: boolean): void {
    this.state.players = [];
    this.state.isHost = false;
    this.state.gameStarted = false;
    this.state.gamePlayers = [];
    this.state.floorItems = [];
    this.state.level = 1;
    this.state.isDemon = false;
    this.state.showDemonModal = false;
    this.state.itemOptionActive = false;
    this.state.itemOptionItemName = null;
    this.state.itemOptionChoices = [];
    if (clearName) {
      this.state.name = '';
    }
  }
}
