import { Game } from '../../../game';
import { Item } from '../../item';
import { Player } from '../../player';
import { Firewood } from '../Supplies/firewood';
import { Food } from '../Supplies/food';
import { Key } from '../Supplies/key';
import { Tool } from '../Supplies/tool';
export class Satchel extends Item {
    constructor() {
        super('Satchel', 'Can open at any time to produce 3 random supplies.', 1, 2)
     }

    override use(game: Game, player: Player): string {
        const supplies = [Food, Tool];
        const numSupplies = 3; // Always 3 supplies
        let result = 'You opened the satchel and found:\n';
        for(let i = 0; i < numSupplies; i++) {
            const SupplyClass = supplies[Math.floor(Math.random() * supplies.length)];
            const supply = new SupplyClass();
            result += `- ${supply.name}\n`;
            player.addItem(supply);
        }
        player.removeItem(this.name);
        return result;
     }

     override isUsable(game: Game, player: Player): boolean {
        return true;
     }

    override useVerbName(): string {
        return `Open`;
    }
}