import { Game } from '../../game';
import { Event, EventResult } from '../event';
import { Player } from '../player';
export class Cliff extends Event {
    failure: boolean;
    belayer: Player | null = null;
    constructor(players: Player[]) {
        let failure = Math.random() < 0.15;
        super(
            'Cliff Face',
            `Exactly one player must belay the others down the cliff face.\n The belayer is probably strong enough to hold everyone... if they are trustworthy.`,
            [
                {
                    description: 'Climb down the cliff face. If you fall you will take 1 damage. Hope you trust your belayer.',
                },
                {
                    description: 'Try your best to belay the others. 15% chance of failure.',
                    demonText: failure ? 'This will fail.' : 'This will succeed.'
                },
                {
                    description: 'Intentionally fail to belay the others. They won\'t know you did it on purpose.',
                }
            ],
            'individual',
            players
        );
        this.failure = failure;
    }

    override isOptionAvailable(optionNumber: number, player: Player): boolean {
        if (optionNumber === 0) {
            return true;
        } else if(player.wounded)  {
            return false;
        }
        return this.belayer === null || this.belayer.name === player.name;
    }

    override optionSelected(optionNumber: number, player: Player): EventResult {
        if(optionNumber === 0) {
            return { text: 'You are slowly lowered down the cliff face...', color: 'info' };
        } else if (optionNumber === 1) {
            this.belayer = player;
            const message = `${player.name} is the belayer. Hope they try their best...`;
            this.update(message, 'info');
            return { text: 'You are the belayer. You try your best...', color: 'info' };
        } else {
            this.belayer = player;
            this.failure = true;
            const message = `${player.name} is the belayer. Hope they try their best...`;
            this.update(message, 'info');
            return { text: 'You intentionally fail to belay the others. They won\'t know you did it on purpose.', color: 'info' };
        }
    }

    override eventEnded(): EventResult {
        if(this.belayer === null) {
            for(const player of this.players) {
                player.damage(1);
            }
            return { text: 'No one belayed the others! Everyone took 1 damage!', color: 'danger' };
        }
        if(this.failure) {
            for(const player of this.players) {
                if(player.name !== this.belayer?.name) {
                    player.damage(1);
                }
            }
            return { text: `${this.belayer.name} failed and everyone except them took 1 damage!`, color: 'danger' };
        }
        return { text: `${this.belayer.name} succeeded and everyone is safe!`, color: 'success' };
    }

    override eventLikelihood(game: Game): number {
        return 2;
    }
}