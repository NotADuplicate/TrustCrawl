import { Game } from '../../../game';
import { Item } from '../../item';
import { Player } from '../../player';
export class Shiv extends Item {
    constructor() {
        super('Shiv', 'Deals 1 damage to any target.', 1, 1)
     }

    override isUsable(game: Game, player: Player): boolean {
        return true;
    }

    override getOptions(game: Game, player: Player): string[] {
        console.log('Getting options for shiv');
        const eventTargets = game.currentEvent ? game.currentEvent.isStabable() : [];
        const playerTargets = game.players.filter(p => p.health >= 0).map(p => p.name);
        const allTargets = [...new Set([...playerTargets, ...eventTargets])];
        console.log(`Available targets for shiv: ${allTargets.join(', ')}`);
        return allTargets;
    }

    override useWithOption(game: Game, player: Player, option: number): string {
        console.log(`Using shiv with option index: ${option}`);
        if(option > game.players.filter(p => p.health >= 0).length-1) {
            player.removeItem(this.name);
            const result = game.currentEvent?.stab(option-game.players.filter(p => p.health >= 0).length);
            
            return result ? result : 'You used the shiv on the event!';
        }
        const targets = game.players.filter(p => p.health >= 0);
        const index = Math.max(0, Math.min(targets.length - 1, Math.floor(option)));
        const target = targets[index];
        if (!target) {
            return 'No valid target selected.';
        }

        target.damage(1);
        player.removeItem(this.name);
        return `${target.name} takes 1 damage from the shiv!`;
    }
}