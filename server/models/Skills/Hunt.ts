import { Skill } from '../skill';
import { Player } from '../player';
import { RawMeat } from '../Items/Supplies/RawMeat';
export class Hunt extends Skill {
    constructor() {
        super(
            'Hunt',
            'Gain 2d4 raw meat. 50% chance to take a damage'
        );
    }

    override Use(player: Player): string {
        const meatGained = 2 + Math.floor(Math.random() * 4) + Math.floor(Math.random() * 4);
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