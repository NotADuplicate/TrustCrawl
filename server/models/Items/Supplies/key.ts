import { Game } from '../../../game';
import { Item } from '../../item';
import { Player } from '../../player';
export class Key extends Item {
    constructor() {
        super('Key', 'A single use key.', 1, 1)
     }

     override isUsable(game: Game, player: Player): boolean {
        return player.inventory.some(item => item.name.includes('Chest'));
     }

     override use(game: Game, player: Player): string {
        const chestIndex = player.inventory.findIndex(item => item.name.includes('Chest'));
        if (chestIndex === -1) {
            return 'There is no chest to use the key on.';
        }
        const chest = player.inventory[chestIndex];
        chest.use(game, player);
        player.removeItem(this.name);
        return `You used the key to open the ${chest.name}.`;
     }
        
}
