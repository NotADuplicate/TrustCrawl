import { Player } from './player';
export type SkillInfo = {
    name: string;
    description: string;
    targeted: boolean;
    options: string[];
    optionTooltips: Record<string, string>;
}
export class Skill {
    constructor() {
    }

    Use(player: Player, target?: Player, option?: string): string {
        // Default does nothing, override for custom behavior
        return '';
    }

    getInfo(player: Player): SkillInfo {
        return {
            name: '',
            description: '',
            targeted: false,
            options: [],
            optionTooltips: {}
        };
    }

    reset(): void {
        // Override if the skill has any state that needs to be reset at the end of a floor
    }
}