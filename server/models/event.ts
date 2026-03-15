import { Game } from "../game";
import type { EventHandler } from "../eventhandler";
import { Player } from "./player";

export type EventOption = {
    description: string;
    selectedText?: string;
    color?: 'success' | 'danger' | 'warning' | 'info';
    tooltip?: string;
    demonText?: string;
    quantity?: boolean;
    repeatable?: boolean;
};

export type EventResult = {
    text: string;
    color: 'success' | 'danger' | 'warning' | 'info';
    demonText?: string;
}

export type Selections = {
    optionNumber: number;
    player: Player;
    quantity?: number;
}

export type EventMode = 'group' | 'individual';

export class Event {
    selections: number = 0;
    game?: Game;
    eventHandler?: EventHandler;
    trueProbability: number[] = [];
    public optionSelections: Selections[] = [];
    constructor(
        public title: string,
        public description: string,
        public options: EventOption[],
        public mode: EventMode,
        public players: Player[] = []
    ) { }

    isOptionAvailable(optionNumber: number, player: Player): boolean {
        return true;
    }

    update(message?: string, color: EventResult['color'] = 'info', demonText?: string): void {
        if (!this.eventHandler) {
            return;
        }

        const result = message
            ? { text: message, color, ...(demonText ? { demonText } : {}) }
            : undefined;
        this.eventHandler.broadcastEvent(result);
    }

    optionSelected(optionNumber: number, player: Player, quantity?: number, game?: Game): EventResult  {
        return { text: 'Option selected', color: 'info' };
    }

    optionQuantityMax(optionNumber: number, player: Player): number {
        return 0;
    }

    getOptionInvestigationText(optionNumber: number, player: Player): string | undefined {
        return undefined;
    }

    eventEnded(): EventResult {
        return { text: 'The event has ended.', color: 'info' };
    }

    eventLikelihood(game: Game): number {
        return 1;
    }

    isStabable(): string[] {
        return [];
    }

    seededRandom(player: Player, extraSeed: string = ''): number {
        const gameLevel = this.game ? this.game.level : 0;
        const seed = `${player.name}-${this.title}-${gameLevel}-${extraSeed}`;
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(hash) % 1000 / 1000;
    }

    getRandom(probability: number, index: number = 0): boolean {
        let attempts = 0;
        while((index >= this.trueProbability.length || Math.abs(this.trueProbability[index] - probability) < 0.05) && attempts < 10) {
            this.trueProbability[index] = probability + Math.random() * probability*2 - probability;
            if(probability > 0.5) {
                this.trueProbability[index] = probability + Math.random() * (1-probability)*2 - (1-probability); //add some noise to the true probability so it's not always the same for the same event
            }
            attempts++;
        }
        return Math.random() < this.trueProbability[index];
    }

    optionClicked(optionNumber: number, player: Player, game?: Game): void {
        return;
    }

    stab(target: number): string {
        return `You stabbed the ${this.title}!`;
    }
}
