import { Game } from '../../game';
import { Event, EventResult } from '../event';
import { Player } from '../player';
export class TooSlow extends Event {
    health: number;
    constructor(players: Player[], slowPlayers: Player[]) {
        let health = Math.floor(Math.random() * players.length) + 1;
        const slowNames = slowPlayers.map((player) => player.name).join(', ');
        let description = `A monster has caught up to you because following players failed to continue in time: ${slowNames}.\nAny players can attack the monster to deal a damage to it, but if it survives it will deal an extra damage to ALL players.\nIt has between 1 and ${players.length} health.`;
        if(slowPlayers.length === 1) {
            description = `A monster has caught up to you because ${slowNames} failed to continue in time.\nAny players can attack the monster to deal a damage to it, but if it survives it will deal an extra damage to ALL players.\nIt has between 1 and ${players.length} health.`;
        }
        super(
            'Too Slow!',
            description,
            [
                {
                    description: 'Attack the monster. Take 1 damage and deal damage',
                    demonText: `The monster has ${health} health.`
                },
                {
                    description: 'Wait around, if the monster is not killed by other players, you will take 1 damage.',
                }
            ],
            'individual',
            players
        );
        this.health = health;
    }

    override optionSelected(optionNumber: number, player: Player): EventResult {
        if (optionNumber === 0) {
            this.health -= player.dealDamage();
            player.damage(1);
            return { text: 'You attacked the monster!', color: 'info' };
        }
        return { text: 'You did nothing.', color: 'info' };
    }

    override eventEnded(): EventResult {
        if(this.health > 0) {
            for(const player of this.players) {
                player.damage(1);
            }
            return { text: 'The monster survived and dealt 1 damage to all players!', color: 'danger' };
        }
        return { text: 'The monster was defeated!', color: 'success' };
    }

    override isOptionAvailable(optionNumber: number, player: Player): boolean {
        if(optionNumber === 1) {
            return !player.wounded;
        }
        return true;
    }

    override eventLikelihood(game: Game): number {
        return 2;
    }

    override isStabable(): string[] {
        return ['Monster'];
    }

    override stab(target: number): string {
        this.health -= 1;
        return `You stabbed the monster, dealing 1 damage!`;
    }
}
