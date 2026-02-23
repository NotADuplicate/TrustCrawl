import { Skill } from '../skill';
import { Player } from '../player';
import { Item } from '../item';
import { Tool } from '../Items/Supplies/tool';
export class Craft extends Skill {
    constructor() {
        super(
            'Craft',
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