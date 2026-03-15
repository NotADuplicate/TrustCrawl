import { Skill } from '../skill';
import { Player } from '../player';
export class Search extends Skill {
    override getInfo(player: Player) {
        return {
            name: 'Search',
            description: 'See the items in a player’s inventory.',
            targeted: true,
            options: [],
            optionTooltips: {}
        };
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