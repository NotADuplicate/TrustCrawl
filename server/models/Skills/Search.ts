import { Skill } from '../skill';
import { Player } from '../player';
export class Mend extends Skill {
    constructor() {
        super(
            'Search',
            'See what is in a player\'s inventory.',
            true
        );
    }

    override Use(player: Player, target?: Player): string {
        if (!target) {
            return 'No target selected.';
        }
        const itemCounts: { [key: string]: number } = {};
        target.inventory.forEach((item) => {
            itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
        });
        const itemList = Object.entries(itemCounts).map(([itemName, count]) => `${itemName} x${count}`).join(', ');
        return `${target.name} has: ${itemList}`;
    }
}