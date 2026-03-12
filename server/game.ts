import { Item } from "./models/item";
import { Food } from "./models/Items/Supplies/food";
import { Tool } from "./models/Items/Supplies/tool";
import { Player } from "./models/player";
import { type WebSocket } from 'ws';
import { Event } from "./models/event";

export type GameDifficulty = 'beginner' | 'normal' | 'expert';

export const DIFFICULTY_TIMER_CONFIG: Record<GameDifficulty, { baseSeconds: number; secondsPerPlayer: number }> = {
    beginner: {
        baseSeconds: 35,
        secondsPerPlayer: 6,
    },
    normal: {
        baseSeconds: 20,
        secondsPerPlayer: 5,
    },
    expert: {
        baseSeconds: 15,
        secondsPerPlayer: 4,
    },
};

export class Game {
    readonly clients = new Map<WebSocket, Player>();
    readonly players: Player[] = [];
    private readonly pendingDisconnects = new Map<string, NodeJS.Timeout>();
    private readonly disconnectGraceMs: number;
    public level: number = 1;
    hostSocket: WebSocket | undefined;
    gamePlayers: Player[] | undefined;
    floorItems: Item[] = [];
    demonName: string | null = null;
    currentEvent: Event | null = null;
    difficulty: GameDifficulty = 'normal';

    constructor(disconnectGraceMs = 60_000) {
        this.disconnectGraceMs = disconnectGraceMs;
    }

    addPlayer(socket: WebSocket, name: string): Player {
        let player = this.players.find((entry) => entry.name === name);
        if (!player) {
            player = new Player(name, this);
            this.players.push(player);
        }

        this.clearPendingDisconnect(name);
        this.clients.set(socket, player);
        this.ensureHost();
        this.broadcastState();
        return player;
    }

    removePlayer(socket: WebSocket): Player | undefined {
        const player = this.clients.get(socket);
        if (!player) {
            return undefined;
        }

        this.clients.delete(socket);
        this.ensureHost();
        this.broadcastState();
        return player;
    }

    markDisconnected(socket: WebSocket, onExpire: (player: Player) => void): void {
        const player = this.removePlayer(socket);
        if (!player) {
            return;
        }

        if (this.pendingDisconnects.has(player.name)) {
            return;
        }

        const timeout = setTimeout(() => {
            this.pendingDisconnects.delete(player.name);
            if (Array.from(this.clients.values()).includes(player)) {
                return;
            }

            const playerIndex = this.players.indexOf(player);
            if (playerIndex !== -1) {
                this.players.splice(playerIndex, 1);
            }

            if (this.demonName === player.name) {
                this.demonName = null;
            }

            onExpire(player);
            this.broadcastState();
        }, this.disconnectGraceMs);

        this.pendingDisconnects.set(player.name, timeout);
    }

    private clearPendingDisconnect(name: string): void {
        const timeout = this.pendingDisconnects.get(name);
        if (timeout) {
            clearTimeout(timeout);
            this.pendingDisconnects.delete(name);
        }
    }

    resetGameState(): void {
        console.log('Resetting game state.');
        this.gamePlayers = undefined;
        this.floorItems = [];
        this.hostSocket = undefined;
        this.demonName = null;
        this.players.length = 0;
        this.level = 0;
        this.clients.clear();
        this.difficulty = 'normal';
        for (const timeout of this.pendingDisconnects.values()) {
            clearTimeout(timeout);
        }
        this.pendingDisconnects.clear();
    }

    ensureHost(): void {
        if (this.hostSocket && this.clients.has(this.hostSocket)) {
            return;
        }

        this.hostSocket = Array.from(this.clients.keys())[0];
    }

    broadcastState(): void {
        const playerNames = this.players.map((player) => player.name);
        for (const client of this.clients.keys()) {
            if (client.readyState === client.OPEN) {
                client.send(
                    JSON.stringify({
                        type: 'state',
                        players: playerNames,
                        isHost: client === this.hostSocket,
                        gameStarted: Boolean(this.gamePlayers),
                        difficulty: this.difficulty,
                    }),
                );
            }
        }
    }

    startGame(difficulty: GameDifficulty = 'normal'): boolean {
        if (this.players.length === 0) {
            return false;
        }

        this.difficulty = difficulty;
        this.gamePlayers = this.players;
        for (const player of this.players) {
            player.inventory = [];
            player.health = 3;
            player.stamina = 3;
            player.wounded = false;
            player.dead = false;
            player.addItem(new Food());
            player.addItem(new Food());
            player.addItem(new Tool());
        }

        if(this.players.length > 3 || (this.players.length === 2 && Math.random() < 1.3) || (this.players.length === 3 && Math.random() < 0.6)) {
            const demonIndex = Math.floor(Math.random() * this.players.length);
           this.demonName = this.players[demonIndex]?.name ?? null;
           this.players[demonIndex].isDemon = true;
        }
        this.floorItems = [];
        this.broadcastState();
        this.broadcastGame();
        return true;
    }

    getEventTimerSeconds(): number {
        const config = DIFFICULTY_TIMER_CONFIG[this.difficulty];
        const playerCount = Math.max(1, this.players.filter((player) => player.health >= 0).length);
        return config.baseSeconds + config.secondsPerPlayer * playerCount;
    }

    getEventTimerMs(): number {
        return this.getEventTimerSeconds() * 1000;
    }

    getEventContinueTimerMs(): number {
        return Math.max(1_000, Math.ceil(this.getEventTimerMs()*0.7));
    }

    getRestTimerMs(): number {
        return Math.max(1_000, Math.ceil(this.getEventTimerMs() * 2));
    }

    buildGamePayload(playerName: string): string | null {
        if (!this.gamePlayers) {
            return null;
        }
        console.log('Current event for game:', this.currentEvent?.title);
        const viewingAsDemon = playerName === this.demonName;

        return JSON.stringify({
            type: 'game',
            isDemon: viewingAsDemon,
            level: this.level,
            players: this.gamePlayers.map((player) => ({
                name: player.name,
                health: player.health,
                wellFed: player.wellFed,
                stamina: player.stamina,
                inventory: player.inventory.map((item) => ({
                    name: this.displayItemNameForViewer(item, viewingAsDemon),
                    description: item.description,
                    weight: item.weight,
                    useVerb: item.useVerbName(),
                    usable: player.health >= 0 && item.isUsable(this, player),
                })),
            })),
            floor: this.floorItems.map((item) => ({
                name: item.name,
                description: item.description,
                weight: item.weight,
                useVerb: item.useVerbName(),
                usable: false,
            })),
        });
    }

    private displayItemNameForViewer(item: Item, viewingAsDemon: boolean): string {
        if (viewingAsDemon && item instanceof Food && item.poisoned) {
            return 'Poisoned food';
        }
        return item.name;
    }

    private itemMatchesRequestedNameForPlayer(player: Player, item: Item, requestedName: string): boolean {
        if (item.name === requestedName) {
            return true;
        }
        return player.isDemon && requestedName === 'Poisoned food' && item instanceof Food && item.poisoned;
    }

    private removeInventoryItemForPlayer(player: Player, requestedName: string): Item | undefined {
        const index = player.inventory.findIndex((item) => this.itemMatchesRequestedNameForPlayer(player, item, requestedName));
        if (index === -1) {
            return undefined;
        }
        return player.inventory.splice(index, 1)[0];
    }

    broadcastGame(): void {
        for (const [client, info] of this.clients.entries()) {
            if (client.readyState === client.OPEN) {
                console.log("Here")
                const payload = this.buildGamePayload(info.name);
                if (payload) {
                    console.log(`Broadcasting game state to ${info.name}`);
                    client.send(payload);
                }
            }
        }
    }

    sendGameTo(client: WebSocket): void {
        if (client.readyState !== client.OPEN) {
            return;
        }

        const info = this.clients.get(client);
        if (!info) {
            return;
        }

        const payload = this.buildGamePayload(info.name);
        if (!payload) {
            return;
        }

        client.send(payload);
    }

    sendModal(title: string, description: string, player?: Player): void {
        for (const client of this.clients.keys()) {
            if (client.readyState === client.OPEN) {
                if (player) {
                    const info = this.clients.get(client);
                    if (info?.name !== player.name) {
                        continue;
                    }
                }
                client.send(JSON.stringify({
                    type: 'modal',
                    title,
                    description,
                }));
            }
        }
    }

    moveToFloor(player: Player, itemName: string): boolean {
        if (!this.gamePlayers || player.health < 0) {
            return false;
        }

        const removed = this.removeInventoryItemForPlayer(player, itemName);
        if (!removed) {
            return false;
        }

        this.floorItems.push(removed);
        this.broadcastGame();
        return true;
    }

    moveToInventory(player: Player, itemName: string): boolean {
        console.log(`${player.name} is trying to move ${itemName} to their inventory.`);
        if (!this.gamePlayers || player.health < 0) {
            return false;
        }

        if(player.health < 1) {
            if(itemName != 'Food' || player.inventory.length > 1) {
                return false;
            }
        }

        const index = this.floorItems.findIndex((item) => this.itemMatchesRequestedNameForPlayer(player, item, itemName));
        if (index === -1) {
            return false;
        }

        const [picked] = this.floorItems.splice(index, 1);
        player.addItem(picked);
        this.broadcastGame();
        return true;
    }

    useItem(player: Player, itemName: string): boolean {
        if (!this.gamePlayers || player.health < 0) {
            return false;
        }

        const item = player.inventory.find((entry) => this.itemMatchesRequestedNameForPlayer(player, entry, itemName));
        if (!item || !item.isUsable(this, player)) {
            return false;
        }

        const result = item.use(this, player);
        console.log(result);
        this.broadcastGame();
        return true;
    }

    getItemOptions(player: Player, itemName: string): string[] | null {
        console.log(`${player.name} is requesting options for ${itemName}.`);
        if (!this.gamePlayers || player.health < 0) {
            return null;
        }

        const item = player.inventory.find((entry) => this.itemMatchesRequestedNameForPlayer(player, entry, itemName));
        if (!item || !item.isUsable(this, player)) {
            return null;
        }

        return item.getOptions(this, player);
    }

    useItemWithOption(player: Player, itemName: string, optionIndex: number): boolean {
        if (!this.gamePlayers || player.health < 0) {
            return false;
        }

        const item = player.inventory.find((entry) => this.itemMatchesRequestedNameForPlayer(player, entry, itemName));
        if (!item || !item.isUsable(this, player)) {
            return false;
        }

        const result = item.useWithOption(this, player, optionIndex);
        console.log(result);
        this.broadcastGame();
        return true;
    }
}
