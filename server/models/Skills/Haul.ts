import { Skill } from '../skill';
import { Player } from '../player';
export class Haul extends Skill {
    override getInfo(player: Player) {
        return {
            name: 'Haul',
            description: 'Double your carrying capacity until the next room.',
            targeted: false,
            options: [],
            optionTooltips: {}
        };
    }

    override Use(player: Player): string {
        player.hauling = true;
        return `Your carrying capacity has been doubled until the next room.`;
    }
}