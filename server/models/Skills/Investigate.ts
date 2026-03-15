import { Skill } from '../skill';
import { Player } from '../player';
export class Investigate extends Skill {
    override getInfo(player: Player) {
        return {
            name: 'Investigate',
            description: 'In the next event, get a hint about the outcome.',
            targeted: false,
            options: [],
            optionTooltips: {}
        };
    }

    override Use(player: Player): string {
        player.investigating = true;
        return `You are investigating the next event.`;
    }
}