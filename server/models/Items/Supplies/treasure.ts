import { Game } from '../../../game';
import { Merchant, SuspiciousMerchant } from '../../Events';
import { Item } from '../../item';
import { Player } from '../../player';
import { Gold } from './gold';
export class Treasure extends Item {
    constructor(value: number) {
        super('Treasure', 'A valuable treasure that can be sold at a shop!', 1, value)
     }

     override isUsable(game: Game, player: Player): boolean {
        console.log(`Checking if ${this.name} is usable. Current event: ${game.currentEvent?.title}`);
        return game.currentEvent instanceof SuspiciousMerchant || game.currentEvent instanceof Merchant;
     }

     override use(game: Game, player: Player): string {
        for(let i = 0; i < this.value; i++) {
            player.addItem(new Gold());
        }
        player.removeItem(this.name);
        return `You sold the ${this.name} for ${this.value} gold.`;
    }

    override useVerbName(): string {
        return `Sell`;
    }
}
