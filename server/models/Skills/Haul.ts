import { Skill } from '../skill';
import { Player } from '../player';
import { Item } from '../item';
export class Haul extends Skill {
    constructor() {
        super(
            'Haul',
            'Double your carrying capacity until the next room.'
        );
    }

    override Use(player: Player): string {
        player.hauling = true;
        return `Your carrying capacity has been doubled until the next room.`;
    }
}