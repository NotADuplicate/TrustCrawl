import { Skill } from '../skill';
import { Player } from '../player';
import { RawMeat } from '../Items/Supplies/RawMeat';
export class Hunt extends Skill {
    override getInfo(player: Player) {
        return {
            name: 'Hunt',
            description: `Gain 2d4${player.skillModifier > 0 ? ` + ${player.skillModifier}` : ''} raw meat. 50% chance to take a damage.`,
            targeted: false,
            options: [],
            optionTooltips: {}
        };
    }

    override Use(player: Player): string {
        const meatGained = 2 + Math.floor(Math.random() * 4) + Math.floor(Math.random() * 4) + player.skillModifier;
        for(let i = 0; i < meatGained; i++) {
            player.addItem(new RawMeat());
        }
        if(Math.random() < 0.5) {
            player.damage(1);
            return `You gained ${meatGained} raw meat but took 1 damage.`;
        }
        return `You gained ${meatGained} raw meat.`;
    }
}