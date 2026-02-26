import { Item } from '../item';
import { Player } from '../player';
export class Body extends Item {
    constructor(player: Player) {
        super(`${player.name}'s Body`, 'The wounded body of a fallen player. They can still be saved.', 4, 0)
     }
}