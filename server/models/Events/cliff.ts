import { Game } from '../../game';
import { Event, EventResult } from '../event';
import { Player } from '../player';
export class Cliff extends Event {
    failure: boolean;
    belayer: Player | null = null;
    constructor(players: Player[]) {
        super(
            'Cliff Face',
            `Exactly one player must belay the others down the cliff face.\n The belayer is probably strong enough to hold everyone... if they are trustworthy.`,
            [
                {
                    description: 'Climb down the cliff face. If you fall you will take 1 damage. Hope you trust your belayer.',
                    selectedText: 'You are slowly lowered down the cliff face...',
                },
                {
                    description: 'Try your best to belay the others. 15% chance of failure.',
                    selectedText: 'You are the belayer. You try your best...',
                },
                {
                    description: 'Intentionally fail to belay the others. They won\'t know you did it on purpose.',
                    selectedText: 'You intentionally fail to belay the others. They won\'t know you did it on purpose.',
                }
            ],
            'individual',
            players
        );
        this.failure = this.getRandom(0.15)
        this.options[1].demonText = this.failure ? 'This will fail.' : 'This will succeed.';
    }

    override isOptionAvailable(optionNumber: number, player: Player): boolean {
        if (optionNumber === 0) {
            return this.belayer === null || this.belayer.name !== player.name;
        } else if(player.wounded)  {
            return false;
        }
        return this.belayer === null || this.belayer.name === player.name;
    }

    override optionSelected(optionNumber: number, player: Player): EventResult {
        if(optionNumber === 0) {
            return { text: 'You are slowly lowered down the cliff face...', color: 'info' };
        } else if (optionNumber === 1) {
            return { text: 'You are the belayer. You try your best...', color: 'info' };
        } else {
            this.failure = true;
            return { text: 'You intentionally fail to belay the others. They won\'t know you did it on purpose.', color: 'info' };
        }
    }

    override optionClicked(optionNumber: number, player: Player, game?: Game): void {
        if(optionNumber !== 0) {
            this.belayer = player;
            const message = `${player.name} is the belayer. Hope they try their best...`;
            this.update(message, 'info');
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

    override getOptionInvestigationText(optionNumber: number, player: Player): string | undefined {
        if(optionNumber === 1) {
            return `There is a ${Math.floor((this.trueProbability[0] ?? 0.15)*100)}% chance that the belaying will fail.`;
        }
        return undefined;
    }

    override eventLikelihood(game: Game): number {
        if(game.players.filter(p => p.health > 0).length < 2) {
            return 0;
        }
        return 2;
    }
}
