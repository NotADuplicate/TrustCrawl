import { Game } from '../../game';
import { Event, EventResult } from '../event';
import { Player } from '../player';
export class GamblingGround extends Event {
    willDouble: boolean
    constructor(players: Player[]) {
        const willDouble = Math.random() < 0.6;
        super(
            'Gambling Ground',
            `When this event ends, any items on the ground have a 60% chance of doubling, otherwise they disappear.`,
            [
                {
                    description: 'Ready',
                    demonText: willDouble ? 'The items will double!' : 'The items will disappear!'
                }
            ],
            'group',
            players
        );
        this.willDouble = willDouble;
    }

    override optionSelected(optionNumber: number, player: Player, quantity?: number, game?: Game): EventResult {
        if(this.willDouble) {
            if(game) {
                game.floorItems.push(...game.floorItems);
            }
            return { text: 'The items on the ground have doubled!', color: 'success' };
        } else {
            if(game) {
                game.floorItems = [];
            }
            return { text: 'The items on the ground have disappeared!', color: 'danger' };
        }
    }

    override eventLikelihood(game: Game): number {
        return game.floor > 3 ? 1 : 0
    }
}