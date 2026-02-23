import { Player } from "./player";

export class Item {
    constructor(
        public name: string,
        public description: string,
        public weight: number,
        public value: number = 0
    ) { }

    isUsable(): boolean {
        return false;
    }

    use(player: Player): string {
        return `You can't use the ${this.name}.`;
    }
}
