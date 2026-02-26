import { Game } from "./game";
import { Beast, Rubble, Monster, Chasm, Treasure, HotSpring, Cliff, Merchant, Carcass, Spiders, SuspiciousMerchant, GiantBoar } from "./models/Events";
import { Boss } from "./models/Events/boss";
import { GamblingGround } from "./models/Events/gambling";
import { Traps } from "./models/Events/traps";
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
    private lastThreeEvents: Event[] = [];
    private bossEvent: Boss | null = null;
    eventActive = false;

    private readonly EventPool = [
        Rubble,
        Beast,
        Monster,
        Chasm,
        Treasure,
        HotSpring,
        Cliff,
        Merchant,
        Traps,
        GamblingGround,
        Carcass,
        Spiders,
        SuspiciousMerchant,
        GiantBoar
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
        this.bossEvent = new Boss(this.game.players);
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
        if (this.endContinues.size >= this.game.players.filter(p => p.health>0).length) {
            this.endContinues.clear();
            this.onEventFinished?.();
        }
    }

    handleVote(socket: WebSocket, player: Player, optionIndex: number, quantity?: number): boolean {
        if (!this.eventActive) {
            return false;
        }

        if (this.currentEvent.mode === 'individual' && this.revealedPlayers.has(player.name)) {
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
            const option = this.currentEvent.options[optionIndex];
            const result = this.currentEvent.optionSelected(optionIndex, player, quantity);
            if (option?.repeatable) {
                this.votes.delete(player.name);
                this.sendEventTo(socket);
                return false;
            }

            this.revealedPlayers.add(player.name);
            this.sendEventTo(socket, result);
            if (this.revealedPlayers.size >= this.game.players.filter(p => p.health>0).length) {
                const endResult = this.currentEvent.eventEnded();
                this.revealEvent(endResult);
                return true;
            }
            return false;
        }

        if (this.votes.size >= this.game.players.filter(p => p.health>0).length) {
            const resolved = this.groupEventResolve();
            if (resolved.repeatable) {
                this.votes.clear();
                if (this.eventTimer) {
                    clearTimeout(this.eventTimer);
                    this.eventTimer = undefined;
                }
                this.eventStartedAt = Date.now();
                this.ensureEventTimer();
                this.broadcastEvent();
                return false;
            }

            this.revealEvent(resolved.result);
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
        console.log(`Starting event in direction`);
        this.currentEvent = direction === 'left' ? this.previewLeft! : this.previewRight!; 
        this.game.currentEvent = this.currentEvent;
        this.eventActive = true;
        this.eventFinished = false;
        this.votes.clear();
        this.revealedPlayers.clear();
        this.endContinues.clear();
        this.eventStartedAt = Date.now();
        this.previewLeft = undefined;
        this.previewRight = undefined;

        this.lastThreeEvents.push(this.currentEvent);
        if (this.lastThreeEvents.length > 3) {
            this.lastThreeEvents.shift();
        }

        this.ensureEventTimer();
        this.broadcastEvent();
    }

    prepareRestPreviews(): void {
        if (this.game.players.filter(p => p.health>0).length === 0) {
            return;
        }

        this.previewLeft = this.pickEvent();
        this.previewLeft.game = this.game;
        this.previewRight = this.pickEvent();
        this.previewRight.game = this.game;
    }

    pickEvent(): Event {
        if(this.game.level >= 12 && this.game.level % 2 === 0) {
            return this.bossEvent!;
        }
        const candidates = this.EventPool.map((EventType) => {
            const instance = new EventType(this.game.players);
            if(instance.title === this.currentEvent.title || this.lastThreeEvents.some(e => e.title === instance.title)) {
                return { instance, weight: 0 };
            }
            instance.game = this.game;
            console.log(instance.title, 'likelihood:', instance.eventLikelihood(this.game));
            const weight = Math.max(0, instance.eventLikelihood(this.game));
            return { instance, weight };
        });

        const totalWeight = candidates.reduce((sum, entry) => sum + entry.weight, 0);
        if (totalWeight <= 0) {
            return candidates[0]?.instance ?? new Rubble(this.game.players);
        }

        let roll = Math.random() * totalWeight;
        for (const entry of candidates) {
            roll -= entry.weight;
            if (roll <= 0) {
                return entry.instance;
            }
        }

        return candidates[0].instance;
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
        if (this.game.players.filter(p => p.health>0).length === 0) {
            return;
        }

        for (const player of this.game.players.filter(p => p.health>0 && !this.revealedPlayers.has(p.name))) {
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
                repeatable: option.repeatable ?? false,
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
                const resolved = this.groupEventResolve();
                if (resolved.repeatable) {
                    this.votes.clear();
                    this.eventTimer = undefined;
                    this.eventStartedAt = Date.now();
                    this.ensureEventTimer();
                    this.broadcastEvent();
                    return;
                }

                this.revealEvent(resolved.result);
                return;
            }
            for (const playerName of this.votes.keys()) {
                const optionIndex = this.votes.get(playerName) ?? 0;
                const player = this.game.players.find((entry) => entry.name === playerName);
                if (!player) {
                    continue;
                }

                this.currentEvent.optionSelected(optionIndex, player);
                const repeatable = this.currentEvent.options[optionIndex]?.repeatable ?? false;
                if (!repeatable) {
                    this.revealedPlayers.add(playerName);
                }
            }

            if (this.revealedPlayers.size >= this.game.players.filter(p => p.health>0).length) {
                const result = this.currentEvent.eventEnded();
                this.revealEvent(result);
                return;
            }

            this.votes.clear();
            this.eventTimer = undefined;
            this.eventStartedAt = Date.now();
            this.ensureEventTimer();
            this.broadcastEvent();
        }, 45_000);
    }

    groupEventResolve(): { selectedOption: number | null; selectedPlayer: string | null; result: EventResult; repeatable: boolean } {
        let selectedOption: number | null = null;
        let selectedPlayer: string | null = null;
        const voters = Array.from(this.votes.keys());
        if (voters.length > 0) {
            selectedPlayer = voters[Math.floor(Math.random() * voters.length)];
            selectedOption = this.votes.get(selectedPlayer) ?? null;
        }

        const optionIndex = selectedOption ?? 0;
        const result = this.currentEvent.optionSelected(optionIndex, this.game.players.find(p => p.name === selectedPlayer) ?? this.game.players[0]);
        const repeatable = this.currentEvent.options[optionIndex]?.repeatable ?? false;
        return { selectedOption, selectedPlayer, result, repeatable };
    }
}