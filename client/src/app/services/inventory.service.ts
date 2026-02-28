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
  hasUnseenFloorItems: boolean;
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
    hasUnseenFloorItems: false,
  };

  private readonly storageKey = 'trust-crawl-name';
  private readonly demonDismissedKeyPrefix = 'trust-crawl-demon-dismissed';
  private demonModalDismissed = false;
  private inventoryRouteActive = false;
  private floorSignature = '';
  private readonly gameStartListeners: Array<() => void> = [];

  constructor(private readonly socket: SocketService) {
    this.socket.subscribe((data) => {
      if (data.type === 'state' && Array.isArray(data['players'])) {
        this.applyLobbyState(
          data['players'] as string[],
          Boolean(data['isHost']),
          Boolean(data['gameStarted']),
        );
      }

      if (data.type === 'game' && Array.isArray(data['players']) && Array.isArray(data['floor'])) {
        this.applyGameState(
          data['players'] as PlayerState[],
          data['floor'] as GameItem[],
          typeof data['level'] === 'number' ? data['level'] : this.state.level,
          Boolean(data['isDemon']),
        );
      }

      if (data.type === 'item-options') {
        this.state.itemOptionActive = true;
        this.state.itemOptionItemName = typeof data['itemName'] === 'string' ? data['itemName'] : null;
        this.state.itemOptionChoices = Array.isArray(data['options']) ? (data['options'] as string[]) : [];
      }
    });

    if (typeof localStorage !== 'undefined') {
      const savedName = localStorage.getItem(this.storageKey);
      if (savedName) {
        this.state.name = savedName;
        const dismissedKey = this.getDemonDismissedKey(savedName);
        this.demonModalDismissed = localStorage.getItem(dismissedKey) === 'true';
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
    return this.currentPlayer?.inventory ?? [];
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
    return this.currentPlayer?.health ?? 0;
  }

  get myStamina(): number {
    return this.currentPlayer?.stamina ?? 0;
  }

  get myWellFed(): boolean {
    return Boolean(this.currentPlayer?.wellFed);
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
    if (!this.canSendGameAction(itemName)) {
      return;
    }

    this.socket.send({ type: 'moveToFloor', itemName });
  }

  moveToInventory(itemName: string): void {
    if (!this.canSendGameAction(itemName)) {
      return;
    }

    this.socket.send({ type: 'moveToInventory', itemName });
  }

  useItem(itemName: string): void {
    if (!this.canSendGameAction(itemName)) {
      return;
    }

    this.socket.send({ type: 'useItem', itemName });
  }

  useItemWithOption(itemName: string, optionIndex: number): void {
    if (!this.canSendGameAction(itemName)) {
      return;
    }

    this.socket.send({ type: 'useItemOption', itemName, optionIndex });
    this.clearItemOptions();
  }

  clearItemOptions(): void {
    this.resetItemOptions();
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

  setInventoryRouteActive(active: boolean): void {
    this.inventoryRouteActive = active;
    if (active) {
      this.state.hasUnseenFloorItems = false;
    }
  }

  private getDemonDismissedKey(name: string): string {
    if (!name.trim()) {
      return '';
    }
    return `${this.demonDismissedKeyPrefix}:${name.trim()}`;
  }

  private get currentPlayer(): PlayerState | undefined {
    const selfName = this.state.name.trim();
    return this.state.gamePlayers.find((entry) => entry.name === selfName);
  }

  private canSendGameAction(itemName: string): boolean {
    return Boolean(itemName && this.connected && this.state.gameStarted);
  }

  private applyLobbyState(players: string[], isHost: boolean, gameStarted: boolean): void {
    const startedNow = gameStarted;
    const wasStarted = this.state.gameStarted;
    this.state.players = players;
    this.state.isHost = isHost;
    this.state.gameStarted = startedNow;

    if (startedNow && !wasStarted) {
      for (const listener of this.gameStartListeners) {
        listener();
      }
    }
  }

  private applyGameState(players: PlayerState[], floorItems: GameItem[], level: number, isDemon: boolean): void {
    const nextFloorSignature = this.getItemSignature(floorItems);
    const floorChanged = nextFloorSignature !== this.floorSignature;
    this.state.gameStarted = true;
    this.state.gamePlayers = players;
    this.state.floorItems = floorItems;
    this.state.level = level;
    this.state.isDemon = isDemon;
    this.state.showDemonModal = isDemon && !this.demonModalDismissed;
    this.floorSignature = nextFloorSignature;
    if (floorChanged) {
      this.state.hasUnseenFloorItems = floorItems.length > 0 && !this.inventoryRouteActive;
    } else if (this.inventoryRouteActive) {
      this.state.hasUnseenFloorItems = false;
    }
  }

  private resetItemOptions(): void {
    this.state.itemOptionActive = false;
    this.state.itemOptionItemName = null;
    this.state.itemOptionChoices = [];
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
    this.state.hasUnseenFloorItems = false;
    this.resetItemOptions();
    this.floorSignature = '';
    if (clearName) {
      this.state.name = '';
    }
  }

  private getItemSignature(items: GameItem[]): string {
    return items
      .map((item) => `${item.name}|${item.description}|${item.weight}|${item.usable ? '1' : '0'}`)
      .join('||');
  }
}
