import { Skill } from '../skill';
import { Player } from '../player';
export class Mend extends Skill {
    override getInfo(player: Player) {
        return {
            name: 'Mend',
            description: `Have a ${player.skillModifier+1}/${player.skillModifier + 2} chance to heal target player 1 health.`,
            targeted: true,
            options: [],
            optionTooltips: {}
        };
    }

    override Use(player: Player, target?: Player): string {
        const chance = player.skillModifier + 1 + Math.floor(Math.random() * 2);
        if (chance <= player.skillModifier + 1 && target) {
            target.heal(1);
            return `You healed ${target.name} for 1 health.`;
        }
        return `Your mend attempt failed.`;
    }
}