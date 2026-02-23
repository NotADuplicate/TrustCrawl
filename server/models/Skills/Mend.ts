import { Skill } from '../skill';
import { Player } from '../player';
import { Item } from '../item';
export class Mend extends Skill {
    constructor() {
        super(
            'Mend',
            'Have a 2/3rds chance to heal target player 1 health.',
            true
        );
    }

    override Use(player: Player, target?: Player): string {
        const chance = Math.floor(Math.random() * 6) + 1;
        if (chance <= 4 && target) {
            target.heal(1);
            return `You healed ${target.name} for 1 health.`;
        }
        return `Your mend attempt failed.`;
    }
}