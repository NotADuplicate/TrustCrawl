import { Skill } from '../../skill';
import { Player } from '../../player';
export class Disturb extends Skill {
    constructor() {
        super(
            'Disturb',
            'Target player will not regain stamina if they choose to sleep this rest.',
            true
        );
    }

    override Use(player: Player, target?: Player): string {
        if (!target) {
            return 'No target selected for Disturb.';
        }
        target.disturbed = true;
        return `You disturbed ${target.name}'s rest! They will not regain stamina this turn.`;
    }
}