import { Skill } from '../skill';
import { Player } from '../player';
import { Item } from '../item';
import { Food } from '../Items/Supplies/food';
export class Forage extends Skill {
    constructor() {
        super(
            'Forage',
            'Gain 1d4 food.'
        );
    }

    override Use(player: Player): string {
        const foodGained = Math.floor(Math.random() * 4) + 1;
        for(let i = 0; i < foodGained; i++) {
            player.addItem(new Food());
        }
        return `You gained ${foodGained} food.`;
    }
}