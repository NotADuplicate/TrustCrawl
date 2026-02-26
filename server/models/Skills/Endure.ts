import { Skill } from '../skill';
import { Player } from '../player';
import { Item } from '../item';
export class Endure extends Skill {
    constructor() {
        super(
            'Endure',
            'Until your next rest, any time you would lose health, lose stamina first.'
        );
    }

    override Use(player: Player): string {
        player.enduring = true;
        return `You are now enduring. Until your next rest, any time you would lose health, you will lose stamina first.`;
    }
}