import { Game } from '../../game';
import { Item } from '../item';
import { Player } from '../player';
import { RawMeat } from './Supplies/RawMeat';
export class Corpse extends Item {
    constructor(player: Player) {
        super(`${player.name}'s Corpse`, 'They can no longer be saved.', 4, 0)
     }

     override useVerbName(): string {
         return 'Cannibalize';
     }

     override use(game: Game, player: Player): string {
        player.removeItem(this.name);
        for(let i = 0; i < 4; i++) {
            player.addItem(new RawMeat());
        }
        return `${player.name} cannibalized ${this.name} and gained 4 Raw Meat.`;
     }
}