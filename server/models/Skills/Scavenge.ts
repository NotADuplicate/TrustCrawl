import { Skill } from '../skill';
import { Player } from '../player';
import { Tool } from '../Items/Supplies/tool';
export class Scavenge extends Skill {
    constructor() {
        super(
            'Scavenge',
            'Gain 1d4 tools.'
        );
    }

    override Use(player: Player): string {
        const toolsGained = Math.floor(Math.random() * 4) + 1;
        for(let i = 0; i < toolsGained; i++) {
            player.addItem(new Tool());
        }
        return `You gained ${toolsGained} tools.`;
    }
}