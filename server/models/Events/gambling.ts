import { Game } from '../../game';
import { Event, EventResult } from '../event';
import { Player } from '../player';
export class GamblingGround extends Event {
    willDouble: boolean
    constructor(players: Player[]) {
        super(
            'Gambling Ground',
            `When this event ends, any items on the ground have a 60% chance of doubling, otherwise they disappear.`,
            [
                {
                    description: 'Ready',
                }
            ],
            'group',
            players
        );
        this.willDouble = this.getRandom(0.6);
        this.options[0].demonText = this.willDouble ? 'The items will double!' : 'The items will disappear!';
    }

    override optionSelected(optionNumber: number, player: Player, quantity?: number, game?: Game): EventResult {
        console.log(game?.floorItems);
        if(this.willDouble) {
            const items = [...(this.game?.floorItems ?? [])];
            for(const item of items) {
                const newItem = Object.assign(Object.create(Object.getPrototypeOf(item)), item);
                this.game?.floorItems.push(newItem);
            }
            return { text: 'The items on the ground have doubled!', color: 'success' };
        } else {
            this.game!.floorItems = [];
            return { text: 'The items on the ground have disappeared!', color: 'danger' };
        }
    }

    override getOptionInvestigationText(optionNumber: number, player: Player): string | undefined {
        return `There is a ${Math.floor((this.trueProbability ?? 0.6)*100)}% chance that the items will double.`;
    }

    override eventLikelihood(game: Game): number {
        return game.level > 3 ? 1 : 0
    }
}
