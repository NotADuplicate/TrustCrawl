import { Game } from '../../../game';
import { Merchant, SuspiciousMerchant } from '../../Events';
import { Item } from '../../item';
import { Player } from '../../player';
import { Food } from './food';
import { Gold } from './gold';
export class Firewood extends Item {
    constructor() {
        super('Firewood', 'Cook all the raw meat in your inventory into food.', 1, 1);
     }

     override isUsable(game: Game, player: Player): boolean {
        return player.inventory.some(item => item.name === 'Raw Meat');
     }

     override use(game: Game, player: Player): string {
        for (let i = player.inventory.length - 1; i >= 0; i--) {
            if (player.inventory[i].name === 'Raw Meat') {
                player.inventory.splice(i, 1);
                player.addItem(new Food());
            }
        }
        return `You cooked all the raw meat into food.`;
    }
}