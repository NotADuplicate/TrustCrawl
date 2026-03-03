import { Skill } from '../../skill';
import { Player } from '../../player';
export class Confuse extends Skill {
    constructor() {
        super(
            'Confuse',
            'Target player will pick a random option next event.',
            true
        );
    }

    override Use(player: Player, target?: Player): string {
        if (!target) {
            return 'No target selected for Disturb.';
        }
        target.confused = true;
        return `You confused ${target.name}! They will pick a random option next event.`;
    }
}