import { Skill } from '../skill';
import { Player } from '../player';
export class Train extends Skill {
    override getInfo(player: Player) {
        return {
            name: 'Train',
            description: `Permanently increase your carrying capacity by ${player.skillModifier + 1} or the numbers on all your skills by ${player.skillModifier + 1}.`,
            targeted: false,
            options: ['Carrying Capacity', 'Skills'],
            optionTooltips: {},
        };
    }

    override Use(player: Player, target?: Player, option?: string): string {
        if(option === 'Carrying Capacity') {
            player.carryingCapacity += 1+player.skillModifier;
            return `Your carrying capacity has been permanently increased by ${1+player.skillModifier}!`;
        } else if(option === 'Skills') {
            player.skillModifier += 1+player.skillModifier;
            return `The numbers on all your skills have been permanently increased by ${1+player.skillModifier}!`;
        }
        return `Invalid option.`;
    }
}
