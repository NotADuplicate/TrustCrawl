import { Game } from '../../game';
import { Event, EventResult } from '../event';
import { RawMeat } from '../Items/Supplies/RawMeat';
import { Player } from '../player';
export class GiantBoar extends Event {
    health: number;
    constructor(players: Player[]) {
        let health = Math.floor(Math.random() * players.length) + 2;
        super(
            'GiantBoar',
            `A giant boar stands in your way. Any players can attack the boar to deal damage to it.
            \n If killed it will give 8 raw meat to EVERY player.
            \n It has between 2 and ${players.length+1} health.`,
            [
                {
                    description: 'Attack the beast. Take 2 damage and deal damage',
                    demonText: `The beast has ${health} health.`
                },
                {
                    description: 'Leave it be.'
                }
                ],
            'individual',
            players
        );
        this.health = health;
    }

    override isOptionAvailable(optionNumber: number, player: Player): boolean {
        if(optionNumber === 0) {
            return !player.wounded;
        }
        return true;
    }

    override optionSelected(optionNumber: number, player: Player, quantity?: number): EventResult {
        if (optionNumber === 0) {
            this.health -= player.dealDamage();
            player.damage(2);
            return { text: 'You attacked the beast!', color: 'info' };
        } 
        return { text: 'You did nothing.', color: 'info' };
    }

    override optionQuantityMax(optionNumber: number, player: Player): number {
        if(optionNumber === 1) {
            return player.inventory.filter(item => item.name === 'Food').length;
        }
        return 0;
    }

    override eventEnded(): EventResult {
        if(this.health <= 0) {
            for(const player of this.players) {
                for(let i = 0; i < 8; i++) {
                    player.addItem(new RawMeat());
                }
            }
            return { text: 'You killed the giant boar and gathered 8 raw meat for each player!', color: 'success' };
        }
        return { text: 'The giant boar runs away.', color: 'info' };
    }

    override eventLikelihood(game: Game): number {
        return game.level > 3 ? 2 : 1;
    }

    override isStabable(): string[] {
        return ['Boar'];
    }

    override stab(target: number): string {
        this.health -= 1;
        return `You stabbed the boar, dealing 1 damage!`;
    }
}