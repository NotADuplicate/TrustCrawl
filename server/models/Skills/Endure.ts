import { Skill } from '../skill';
import { Player } from '../player';
export class Endure extends Skill {
    override getInfo(player: Player) {
        return {
            name: 'Endure',
            description: 'Until your next rest, any time you would lose health, lose stamina first.',
            targeted: false,
            options: [],
            optionTooltips: {}
        };
    }

    override Use(player: Player): string {
        player.enduring = true;
        return `You are now enduring. Until your next rest, any time you would lose health, you will lose stamina first.`;
    }
}