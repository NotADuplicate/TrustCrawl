import { Skill } from '../skill';
import { Player } from '../player';
import { Item } from '../item';
export class Investigate extends Skill {
    constructor() {
        super(
            'Investigate',
            'In the next event, get a hint about the outcome.'
        );
    }

    override Use(player: Player): string {
        player.investigating = true;
        return `You are investigating the next event.`;
    }
}