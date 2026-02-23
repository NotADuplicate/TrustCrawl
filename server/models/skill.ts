import { Player } from './player';
export class Skill {
    constructor(
        public name: string,
        public description: string,
        public targeted = false,
        public options: string[] = []
    ) { }

    Use(player: Player, target?: Player, option?: string): string {
        // Default does nothing, override for custom behavior
        return '';
    }
}
