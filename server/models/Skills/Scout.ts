import { Skill } from '../skill';
import { Player } from '../player';
import { Item } from '../item';
export class Scout extends Skill {
    constructor() {
        super(
            'Scout',
            'Pick one of the rooms to see what’s inside before you enter.',
            false,
            ['left', 'right']
        );
    }

    override Use(player: Player, target?: Player, option?: string): string {
        if (option === 'left' || option === 'right') {
            player.scouting = option;
            return `You are now scouting the ${option} room.`;
        }
        return `Invalid option.`;
    }
}
