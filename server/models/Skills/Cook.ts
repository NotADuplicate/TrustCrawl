import { Skill } from '../skill';
import { Player } from '../player';
import { Food } from '../Items/Supplies/food';
export class Cook extends Skill {
    constructor() {
        super(
            'Cook',
            'Turn up to 5 raw meat in your inventory into food.'
        );
    }

    override Use(player: Player): string {
        const rawMeatCount = player.inventory.filter((item) => item.name === 'Raw Meat').length;
        if(rawMeatCount === 0) {
            return 'You have no raw meat to cook.';
        }
        const meatToCook = Math.min(5, rawMeatCount);
        for(let i = 0; i < meatToCook; i++) {
            player.removeItem('Raw Meat');
            player.addItem(new Food());
        }
        return `You cooked ${meatToCook} raw meat into food.`;
    }
}