import { Game } from "../game";
import { Player } from "./player";

export type EventOption = {
    description: string;
    demonText?: string;
    quantity?: boolean;
};

export type EventResult = {
    text: string;
    color: 'success' | 'danger' | 'warning' | 'info';
    demonText?: string;
}

export type EventMode = 'group' | 'individual';

export class Event {
    selections: number = 0;
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

    optionSelected(optionNumber: number, player: Player, quantity?: number, game?: Game): EventResult  {
        return { text: 'Option selected', color: 'info' };
    }

    optionQuantityMax(optionNumber: number, player: Player): number {
        return 0;
    }

    eventEnded(): EventResult {
        return { text: 'The event has ended.', color: 'info' };
    }

    eventLikelihood(game: Game): number {
        return 1;
    }
}
