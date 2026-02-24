import { Game } from "./game";
import { Beast, Rubble, Monster, Chasm, Treasure, HotSpring, Cliff, Merchant } from "./models/Events";
import { Event, EventResult } from "./models/event";
import { Player } from "./models/player";
import { WebSocketServer, type WebSocket } from 'ws';

export class EventHandler {
    private votes = new Map<string, number>();
    private continues = new Set<string>();
    private endContinues = new Set<string>();
    private revealedPlayers = new Set<string>();
    private eventStartedAt = Date.now();
    private eventTimer: NodeJS.Timeout | undefined;
    private eventFinished = false;
    private currentEvent: Event;
    private previewLeft?: Event;
    private previewRight?: Event;
    eventActive = false;

    private readonly EventPool = [
        Rubble,
        Beast,
        Monster,
        Chasm,
        Treasure,
        HotSpring,
        Cliff,
        Merchant
    ];

    constructor(
        private readonly game: Game,
        private readonly onEventFinished?: () => void,
    ) {
        this.currentEvent = new Rubble(this.game.players);
    }

    resetForNewGame(): void {
        this.votes.clear();
        this.continues.clear();
        this.endContinues.clear();
        this.revealedPlayers.clear();
        this.eventFinished = false;
        this.eventActive = false;
        this.eventStartedAt = Date.now();
        this.previewLeft = undefined;
        this.previewRight = undefined;
        if (this.eventTimer) {
            clearTimeout(this.eventTimer);
            this.eventTimer = undefined;
        }
    }

    resetAll(): void {
        this.resetForNewGame();
        this.currentEvent = new Rubble(this.game.players);
    }

    handleDisconnect(player: Player): void {
        console.log(`Player ${player.name} disconnected during event.`);
        this.votes.delete(player.name);
        this.continues.delete(player.name);
        this.endContinues.delete(player.name);
        this.revealedPlayers.delete(player.name);
    }

    handleEventEndContinue(player: Player): void {
        if (!this.eventFinished || !this.game.gamePlayers) {
            return;
        }

        this.endContinues.add(player.name);
        if (this.endContinues.size >= this.game.players.length) {
            this.endContinues.clear();
            this.onEventFinished?.();
        }
    }

    handleContinue(player: Player): boolean {
        throw new Error('handleContinue is deprecated. Use handleEventEndContinue instead.');
        if (!this.game.gamePlayers) {
            return false;
        }

        this.continues.add(player.name);
        if (this.continues.size >= this.game.players.length) {
            this.continues.clear();
            // this.startEvent();
            return true;
        }
        return false;
    }

    handleVote(socket: WebSocket, player: Player, optionIndex: number, quantity?: number): boolean {
        if (!this.eventActive) {
            return false;
        }

        if (optionIndex < 0 || optionIndex >= this.currentEvent.options.length) {
            return false;
        }

        this.votes.set(player.name, optionIndex);
        if (this.currentEvent.options[optionIndex]?.quantity) {
            const max = this.currentEvent.optionQuantityMax(optionIndex, player);
            quantity = Math.max(0, Math.min(max, Math.floor(quantity ?? 0)));
        }

        if (this.currentEvent.mode === 'individual') {
            const result = this.currentEvent.optionSelected(optionIndex, player, quantity);
            this.revealedPlayers.add(player.name);
            this.sendEventTo(socket, result);
            if (this.revealedPlayers.size >= this.game.players.length) {
                const result = this.currentEvent.eventEnded();
                this.revealEvent(result);
                return true;
            }
            return false;
        }

        if (this.votes.size >= this.game.players.length) {
            const result = this.groupEventResolve();
            this.revealEvent(result);
            return true;
        }
        return false;
    }

    handleEventRequest(socket: WebSocket): void {
        if (!this.eventActive) {
            return;
        }

        this.sendEventTo(socket);
    }

    startEvent(direction: 'left' | 'right'): void {
        this.currentEvent = direction === 'left' ? this.previewLeft! : this.previewRight!; 
        this.eventActive = true;
        this.eventFinished = false;
        this.votes.clear();
        this.revealedPlayers.clear();
        this.endContinues.clear();
        this.eventStartedAt = Date.now();
        this.previewLeft = undefined;
        this.previewRight = undefined;
        this.ensureEventTimer();
        this.broadcastEvent();
    }

    prepareRestPreviews(): void {
        if (this.game.players.length === 0) {
            return;
        }

        this.previewLeft = new (this.EventPool[Math.floor(Math.random() * this.EventPool.length)])(this.game.players);
        this.previewRight = new (this.EventPool[Math.floor(Math.random() * this.EventPool.length)])(this.game.players);
    }

    sendPreviewTo(client: WebSocket, direction: 'left' | 'right'): void {
        if (client.readyState !== client.OPEN) {
            return;
        }

        const info = this.game.clients.get(client);
        if (!info) {
            return;
        }

        if (!this.previewLeft || !this.previewRight) {
            this.prepareRestPreviews();
        }

        const previewEvent = direction === 'left' ? this.previewLeft : this.previewRight;
        if (!previewEvent) {
            return;
        }

        client.send(this.buildPreviewPayload(info.name, previewEvent));
    }

    private getSecondsLeft(): number {
        const elapsedMs = Date.now() - this.eventStartedAt;
        return Math.max(0, Math.ceil((45_000 - elapsedMs) / 1000));
    }

    private ensureRandomVotes(): void {
        if (this.game.players.length === 0) {
            return;
        }

        for (const player of this.game.players) {
            if (!this.votes.has(player.name)) {
                let randomIndex = Math.floor(Math.random() * this.currentEvent.options.length);
                while (!this.currentEvent.isOptionAvailable(randomIndex, player)) {
                    randomIndex = Math.floor(Math.random() * this.currentEvent.options.length);
                }
                this.votes.set(player.name, randomIndex);
            }
        }
    }

    private buildEventPayload(playerName: string, result?: EventResult): string {
        const status = this.currentEvent.mode === 'group'
            ? (this.eventFinished ? 'revealed' : 'voting')
            : (this.revealedPlayers.has(playerName) ? 'revealed' : 'voting');

        const isDemon = playerName === this.game.demonName;
        const player = this.game.players.find((entry) => entry.name === playerName);
        const base = {
            type: 'event' as const,
            title: this.currentEvent.title,
            description: this.currentEvent.description,
            options: this.currentEvent.options.map((option, index) => ({
                description: option.description,
                available: player ? this.currentEvent.isOptionAvailable(index, player) : true,
                quantity: option.quantity ?? false,
                max: option.quantity && player ? this.currentEvent.optionQuantityMax(index, player) : undefined,
                ...(isDemon && option.demonText ? { demonText: option.demonText } : {}),
            })),
            mode: this.currentEvent.mode,
            secondsLeft: status === 'revealed' ? 0 : this.getSecondsLeft(),
            status,
        };

        if (status === 'voting') {
            return JSON.stringify(base);
        } 

        if (this.currentEvent.mode === 'individual') {
            const selectedOption = this.votes.get(playerName) ?? null;
            return JSON.stringify({
                ...base,
                selectedOption,
                selectedPlayer: playerName,
                ...(result ? { result } : {}),
            });
        }

        // For group events, calculate results and apply event effects

        const results = this.currentEvent.options.map((_, index) => ({
            optionIndex: index,
            votes: Array.from(this.votes.values()).filter((vote) => vote === index).length,
        }));

        let selectedOption: number | null = null;
        let selectedPlayer: string | null = null;
        const voters = Array.from(this.votes.keys());
        if (voters.length > 0) {
            selectedPlayer = voters[Math.floor(Math.random() * voters.length)];
            selectedOption = this.votes.get(selectedPlayer) ?? null;
        }

        return JSON.stringify({
            ...base,
            results,
            selectedOption,
            selectedPlayer,
        });
    }

    private buildPreviewPayload(playerName: string, event: Event): string {
        const isDemon = playerName === this.game.demonName;
        const player = this.game.players.find((entry) => entry.name === playerName);
        return JSON.stringify({
            type: 'event-preview' as const,
            title: event.title,
            description: event.description,
            options: event.options.map((option, index) => ({
                description: option.description,
                available: player ? event.isOptionAvailable(index, player) : true,
                quantity: option.quantity ?? false,
                max: option.quantity && player ? event.optionQuantityMax(index, player) : undefined,
                ...(isDemon && option.demonText ? { demonText: option.demonText } : {}),
            })),
            mode: event.mode,
            secondsLeft: 0,
            status: 'preview' as const,
            preview: true,
        });
    }

    broadcastEvent(): void {
        for (const [client, info] of this.game.clients.entries()) {
            if (client.readyState === client.OPEN) {
                client.send(this.buildEventPayload(info.name));
            }
        }
    }

    sendEventTo(client: WebSocket, result?: EventResult): void {
        if (client.readyState !== client.OPEN) {
            return;
        }

        const info = this.game.clients.get(client);
        if (!info) {
            return;
        }

        client.send(this.buildEventPayload(info.name, result));
    }

    private revealEvent(result: EventResult): void {
        if (this.eventFinished) {
            return;
        }

        this.eventFinished = true;
        if (this.eventTimer) {
            clearTimeout(this.eventTimer);
            this.eventTimer = undefined;
        }
        this.broadcastEvent();
        this.broadcastEventEnded(result);
        this.eventActive = false;
    }

    private broadcastEventEnded(result: EventResult): void {
        for (const client of this.game.clients.keys()) {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify({
                    type: 'event-ended',
                    message: result.text,
                    color: result.color,
                    demonText: result.demonText,
                }));
            }
        }
    }

    private ensureEventTimer(): void {
        if (this.eventTimer || this.eventFinished) {
            return;
        }

        this.eventTimer = setTimeout(() => {
            this.ensureRandomVotes();
            if (this.currentEvent.mode === 'group') {
                const result = this.groupEventResolve();
                this.revealEvent(result);
                return;
            }
            for (const playerName of this.votes.keys()) {
                this.revealedPlayers.add(playerName);
            }
            const result = this.currentEvent.eventEnded();
            this.revealEvent(result);
        }, 45_000);
    }

    groupEventResolve(): EventResult {
        let selectedOption: number | null = null;
        let selectedPlayer: string | null = null;
        const voters = Array.from(this.votes.keys());
        if (voters.length > 0) {
            selectedPlayer = voters[Math.floor(Math.random() * voters.length)];
            selectedOption = this.votes.get(selectedPlayer) ?? null;
        }

        return this.currentEvent.optionSelected(selectedOption ?? 0, this.game.players.find(p => p.name === selectedPlayer) ?? this.game.players[0]);
    }
}