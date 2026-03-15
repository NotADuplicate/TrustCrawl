import { Skill } from '../skill';
import { Player } from '../player';
import { Tool } from '../Items/Supplies/tool';
export class Scavenge extends Skill {
    override getInfo(player: Player) {
        return {
            name: 'Scavenge',
            description: `Gain 1d4${player.skillModifier > 0 ? ` + ${player.skillModifier}` : ''} tools.`,
            targeted: false,
            options: [],
            optionTooltips: {}
        };
    }

    override Use(player: Player): string {
        const toolsGained = Math.floor(Math.random() * 4) + 1 + player.skillModifier;
        for(let i = 0; i < toolsGained; i++) {
            player.addItem(new Tool());
        }
        return `You gained ${toolsGained} tools.`;
    }
}