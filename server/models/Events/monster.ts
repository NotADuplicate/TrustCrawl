import { Event, EventResult } from '../event';
import { Player } from '../player';
export class Monster extends Event {
    health: number;
    constructor(players: Player[]) {
        let health = Math.floor(Math.random() * players.length) + 1;
        super(
            'Monster',
            `Any players can attack the monster to deal a damage to it, but if it survives it will deal an extra damage to ALL players.\nIt has between 1 and ${players.length} health.`,
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
}