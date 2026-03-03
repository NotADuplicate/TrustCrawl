import { Skill } from '../../skill';
import { Player } from '../../player';
import { Food } from '../../Items/Supplies/food';
export class Poison extends Skill {
    constructor() {
        super(
            'Poison',
            `Poison 1 food item in your inventory. Other players cannot tell it is poisoned.
            \nPoisoned food will deal 1 damage when consumed.`
        );
    }

    override Use(player: Player): string {
        const foodItems = player.inventory.filter((item) => item.name === 'Food' && !(item as Food).poisoned);
        if(foodItems.length === 0) {
            return 'You have no food to poison.';
        }
        const foodToPoison = foodItems[0] as Food;
        foodToPoison.poisoned = true;
        return `You poisoned a food item in your inventory. Be careful when consuming it!`;
    }
}