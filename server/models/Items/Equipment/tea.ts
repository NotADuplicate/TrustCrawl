import { Game } from '../../../game';
import { Item } from '../../item';
import { Player } from '../../player';
export class Tea extends Item {
    constructor() {
        super('Tea', 'Restore all stamina.', 1, 0.8)
     }

    override isUsable(game: Game, player: Player): boolean {
        return true;
    }

    override use(game: Game, player: Player): string {
        player.stamina = player.maxStamina;
        player.removeItem(this.name);
        return 'You feel energized and ready to take on the next challenge!';
    }

    override useVerbName(): string {
        return `Drink`;
    }
}