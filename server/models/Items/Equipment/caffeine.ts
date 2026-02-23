import { Item } from '../../item';
import { Player } from '../../player';
export class Tea extends Item {
    constructor() {
        super('Tea', 'Restore all stamina.', 1, 1)
     }

    override isUsable(): boolean {
        return true;
    }

    override use(player: Player): string {
        player.stamina = 3//player.maxStamina;
        player.removeItem(this.name);
        return 'You feel energized and ready to take on the next challenge!';
    }
}