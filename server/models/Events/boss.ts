import { Game } from '../../game';
import { Event, EventResult } from '../event';
import { Player } from '../player';
export class Boss extends Event {
    health: number;
    scaredOff: boolean = false;
    scareDamage: number = 0;
    constructor(players: Player[]) {
        let health = Math.floor(Math.random() * players.length) + players.length;
        super(
            'Boss Monster',
            `The boss monster stands before you, its presence overwhelming. 
            \nAny players can attack the boss to deal damage, and any player can scare it off, but if it survives it will deal 3 damage to ALL players.
            \nIt has between ${players.length} and ${players.length * 2} health.`,
            [
                {
                    description: 'Attack the monster. Take 2 damage and deal damage',
                    demonText: `The monster has ${health} health.`
                },
                {
                    description: 'Scare it off. This guarantees that the boss will leave, but it will be waiting for you 2 floors later.',
                },
                {
                    description: 'Do nothing.'
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
            player.damage(2);
            return { text: 'You attacked the monster!', color: 'info' };
        } else if (optionNumber === 1) {
            this.scaredOff = true;
            player.damage(this.scareDamage);
            return { text: 'You scared the monster off! It will be waiting for you 2 floors later...', color: 'info' };
        }

        return { text: 'You did nothing.', color: 'info' };
    }

    override eventEnded(): EventResult {
        this.scareDamage++;
        this.options[0].demonText = `The monster has ${this.health} health.`;
        this.options[1].description = `Take ${this.scareDamage} damage and scare it off. This guarantees that the boss will leave, but it will be waiting for you 2 floors later.`;
        if(this.health > 0 && !this.scaredOff) {
            for(const player of this.players) {
                player.damage(3);
            }
            return { text: 'The monster survived and dealt 3 damage to all players!', color: 'danger' };
        } else if (this.health <= 0) {
            return { text: 'The monster was defeated!', color: 'success' };
        }
        return { text: 'The monster was scared off, but it will be waiting for you 2 floors later...', color: 'warning' };
    }

    override isOptionAvailable(optionNumber: number, player: Player): boolean {
        if(optionNumber !== 2) {
            return !player.wounded;
        }
        return true;
    }

    override eventLikelihood(game: Game): number {
        return 0;
    }

    override isStabable(): string[] {
        return ['Boss Monster'];
    }

    override stab(target: number): string {
        this.health -= 1;
        return `You stabbed the monster, dealing 1 damage!`;
    }
}