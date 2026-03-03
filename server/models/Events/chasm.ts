import { Game } from '../../game';
import { Event, EventResult } from '../event';
import { Player } from '../player';
export class Chasm extends Event {
    willCollapse: boolean
    constructor(players: Player[]) {
        super(
            'Chasm',
            `A wide chasm with a flimsy rope bridge stands in your path.
            \nWhich path will your group take?`,
            [
                {
                    description: 'Descend and climb back up the rough cliff face. All players take 1 damage.',
                },
                {
                    description: 'Try crossing the bridge and hope it supports your weight. 1/3rd chance that all players take 2 damage.',
                }
            ],
            'group',
            players
        );
        this.willCollapse = this.getRandom(1/3);
        this.options[1].demonText = this.willCollapse ? 'The bridge will collapse!' : 'The bridge will hold!';
    }

    override optionSelected(optionNumber: number, player: Player, quantity?: number): EventResult {
        if(optionNumber == 0) {
            for(const player of this.players) {
                player.damage(1);
            }
            return { text: 'You descended and climbed back up the rough cliff face, taking 1 damage.', color: 'info' };
        } else if(this.willCollapse){
            for(const player of this.players) {
                player.damage(2);
            }
            return { text: 'The bridge collapsed, and all players took 2 damage.', color: 'danger' };
        }
        return { text: 'You crossed the bridge safely.', color: 'success' };
    }

    override getOptionInvestigationText(optionNumber: number, player: Player): string | undefined {
        if(optionNumber === 1) {
            return `There is a ${Math.floor((this.trueProbability ?? 1/3)*100)}% chance that the bridge will collapse.`;
        }
        return undefined;
    }

    override eventLikelihood(game: Game): number {
        return 2;
    }
}
