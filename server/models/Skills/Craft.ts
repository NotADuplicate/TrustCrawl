import { Skill } from '../skill';
import { Player } from '../player';
import { Key } from '../Items/Supplies/key';
import { Shiv } from '../Items/Supplies/shiv';
export class Craft extends Skill {
    override getInfo(player: Player) {
        return {
            name: 'Craft',
            description: 'Turn a tool into either a key or a shiv.',
            targeted: false,
            options: ['key', 'shiv'],
            optionTooltips: {
                key: 'Used to open chests.',
                shiv: 'Deal 1 damage to any target.',
            }
        };
    }

    override Use(player: Player, target?: Player, option?: string): string {
        if(option === 'key') {
            const toolIndex = player.inventory.findIndex(item => item.name === 'Tool');
            if(toolIndex === -1) {
                return 'You need a Tool to craft a Key.';
            }
            player.inventory.splice(toolIndex, 1);
            player.addItem(new Key());
            return 'You crafted a Key from a Tool!';
        } else if(option === 'shiv') {
            const toolIndex = player.inventory.findIndex(item => item.name === 'Tool');
            if(toolIndex === -1) {
                return 'You need a Tool to craft a Shiv.';
            }
            player.inventory.splice(toolIndex, 1);
            player.addItem(new Shiv());
            return 'You crafted a Shiv from a Tool!';
        }
        return `Invalid option.`;
    }
}
