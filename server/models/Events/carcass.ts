import { Game } from '../../game';
import { Event, EventResult } from '../event';
import { RawMeat } from '../Items/Supplies/RawMeat';
import { Player } from '../player';
export class Carcass extends Event {
    danger: number;
    constructor(players: Player[]) {
        const danger = Math.random();
        super(
            'Carcass',
            `The giant body of a felled beast. It looks like it could be a good source of food, but it also looks like it could attract predators.`,
            [
                {
                    description: 'Don\'t mess with it, leave'
                },
                {
                    description: '80% chance everyone gets 2 raw meat, 20% chance that a predator is attracted and everyone takes 1 damage.',
                    demonText: danger < 0.8 ? 'You successfully gather food.' : 'A predator is attracted!'
                },
                {
                    description: '60% chance everyone gets 4 raw meat, 40% chance that a predator is attracted and everyone takes 1 damage.',
                    demonText: danger < 0.6 ? 'You successfully gather more food.' : 'A predator is attracted!'
                },
                {
                    description: '40% chance everyone gets 6 raw meat, 60% chance that a predator is attracted and everyone takes 1 damage.',
                    demonText: danger < 0.4 ? 'You successfully gather a lot of food.' : 'A predator is attracted!'
                }
            ],
            'group',
            players
        );
        this.danger = danger;
    }

    override optionSelected(optionNumber: number, player: Player, quantity?: number): EventResult {
        if(optionNumber === 0) {
            return { text: 'You decide to leave the carcass alone and continue on your way.', color: 'info' };
        } else if(this.danger > optionNumber * 0.2) {
            const meatGained = optionNumber * 2;
            for(const player of this.players) {
                for(let i = 0; i < meatGained; i++) {
                    player.addItem(new RawMeat());
                }
            }
            return { text: `You successfully gather ${meatGained} raw meat for each player.`, color: 'success' };
        } else {
            for(const player of this.players) {
                player.damage(1);
            }
            return { text: 'A predator is attracted to the carcass and attacks, dealing 1 damage to each player.', color: 'danger' };
        }
    }

    override eventLikelihood(game: Game): number {
        return 2;
    }
}