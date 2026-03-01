import { Game } from "../game";
import { Player } from "./player";

export class Item {
    constructor(
        public name: string,
        public description: string,
        public weight: number,
        public value: number = 0
    ) { }

    isUsable(game: Game, player: Player): boolean {
        return false;
    }

    use(game: Game, player: Player): string {
        return `You can't use the ${this.name}.`;
    }

    useVerbName(): string {
        return `Use`;
    }

    getOptions(game: Game, player: Player): string[] {
        return [];
    }

    useWithOption(game: Game, player: Player, option: number): string {
        return `You can't use the ${this.name} with that option.`;
    }
}
