import { Event, EventResult } from '../event';
import { Item } from '../item';
import { Player } from '../player';
import { Treasure as TreasureItem } from '../Items/Supplies/treasure';
import { Game } from '../../game';
export class Treasure extends Event {
    treasureValue: number;
    constructor(players: Player[]) {
        const value = Math.floor(Math.random() * players.length*2) + 1;
        super(
            'Treasure',
            `A golden idol sits on a trapped pedestal..
            \nShould you risk grabbing it?`,
            [
                {
                    description: 'Leave the treasure alone and continue on your way.',
                },
                {
                    description: `Grab the idol! It can be sold at shops for somewhere between 1 and ${players.length*2} gold.`,
                    demonText: `The idol is worth ${value} gold.`
                }
            ],
            'group',
            players
        );
        this.treasureValue = value;
    }

    override optionSelected(optionNumber: number, player: Player, quantity?: number): EventResult {
        if (optionNumber === 0) {
            return { text: 'You leave the treasure alone and continue on your way.', color: 'info' };
        } else {
            player.addItem(new TreasureItem(this.treasureValue));
            return { text: `You grab the treasure!`, color: 'success' };
        }
    }

    override eventLikelihood(game: Game): number {
        return game.floor < 5 ? 1 : 0
    }
}