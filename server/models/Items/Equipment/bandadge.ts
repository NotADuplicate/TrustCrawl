import { Game } from '../../../game';
import { Item } from '../../item';
import { Player } from '../../player';
export class Bandadge extends Item {
    constructor() {
        super('Bandadge', 'Restore 1 health.', 1, 1)
     }

    override isUsable(game: Game, player: Player): boolean {
        return true;
    }

    override getOptions(game: Game, player: Player): string[] {
        console.log('Getting options for Bandadge');
        return game.players.filter(p => p.health >= 0).map((entry) => entry.name);
    }

    override use(game: Game, player: Player): string {
        player.heal(1);
        player.removeItem(this.name);
        return 'You feel energized and ready to take on the next challenge!';
    }

    override useVerbName(): string {
        return `Heal`;
    }

    override useWithOption(game: Game, player: Player, option: number): string {
        const targets = game.players.filter(p => p.health >= 0);
        const index = Math.max(0, Math.min(targets.length - 1, Math.floor(option)));
        const target = targets[index];
        if (!target) {
            return 'No valid target selected.';
        }

        target.heal(1);
        player.removeItem(this.name);
        return `${target.name} feels energized and ready to take on the next challenge!`;
    }
}