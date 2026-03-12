import { Game } from '../../game';
import { Event, EventResult } from '../event';
import { Player } from '../player';
export class TrustAltar extends Event {
    firstOptionDemon: boolean;
    secondOptionDemon: boolean;
    thirdOptionDemon: boolean;
    randomPlayer1: Player;
    randomPlayer2: Player;
    randomPlayer3: Player;
    constructor(players: Player[]) {
        super(
            'Trust Altar',
            `A mysterious altar stands in the middle of the path. It offers information on who can be trusted.
            \n But requires a sacrifice...`,
            [
                {
                    description: '50% chance to deal a damage to the demon, 50% chance to deal a damage to a random human player.',
                },
                {
                    description: '90% chance to deal damage to a random human player, 10% chance to deal damage to the demon.',
                },
                {
                    description: 'Deal 1 damage to a player who has an 85% chance of being the demon. 2 damage to all other players.',
                }
            ],
            'group',
            players
        );
        this.firstOptionDemon = this.getRandom(0.5);
        this.secondOptionDemon = this.getRandom(0.9,1);
        this.thirdOptionDemon = this.getRandom(0.85,2);
        const humanPlayers = this.players.filter(p => !p.isDemon);
        this.randomPlayer1 = humanPlayers[Math.floor(Math.random() * humanPlayers.length)];
        this.randomPlayer2 = humanPlayers[Math.floor(Math.random() * humanPlayers.length)];
        this.randomPlayer3 = humanPlayers[Math.floor(Math.random() * humanPlayers.length)];

        this.options[0].demonText = this.firstOptionDemon ? 'This will damage you!' : `This will damage ${this.randomPlayer1.name}!`;
        this.options[1].demonText = this.secondOptionDemon ? `This will damage ${this.randomPlayer2.name}!` : 'This will damage you!';
        this.options[2].demonText = this.thirdOptionDemon ? `This will deal 1 damage to you and 2 to everyone else!` : `This will deal 1 damage to ${this.randomPlayer3.name} and 2 to everyone else!`;
    }

    override optionSelected(optionNumber: number, player: Player, quantity?: number): EventResult {
        const demonPlayer = this.players.find(p => p.isDemon);
        if(optionNumber == 0) {
            if(this.firstOptionDemon) {
                demonPlayer?.damage(1);
                return { text: `The altar dealt 1 damage to ${demonPlayer?.name}!`, color: 'info' };
            } else {
                this.randomPlayer1.damage(1);
                return { text: `The altar dealt 1 damage to ${this.randomPlayer1.name}!`, color: 'info' };
            }
        } else if(optionNumber == 1) {
            if(this.secondOptionDemon) {
                this.randomPlayer2.damage(1);
                return { text: `The altar dealt 1 damage to ${this.randomPlayer2.name}!`, color: 'info' };
            } else {
                demonPlayer?.damage(1);
                return { text: `The altar dealt 1 damage to ${demonPlayer?.name}!`, color: 'info' };
            }
        } else {
            if(this.thirdOptionDemon) {
                demonPlayer?.damage(1);
                for(const player of this.players) {
                    if(player !== demonPlayer) {
                        player.damage(2);
                    }
                }
                return { text: `The altar dealt 1 damage to ${demonPlayer?.name} and 2 damage to all other players!`, color: 'info' };
            } else {
                this.randomPlayer3.damage(1);
                for(const player of this.players) {
                    if(player !== this.randomPlayer3) {
                        player.damage(2);
                    }
                }
                return { text: `The altar dealt 1 damage to ${this.randomPlayer3.name} and 2 damage to all other players!`, color: 'info' };
            }
        }
    }

    override getOptionInvestigationText(optionNumber: number, player: Player): string | undefined {
        if(optionNumber === 0) {
            return `There is a ${Math.floor((this.trueProbability[0] ?? 0.5)*100)}% chance that this will damage the demon.`;
        } else if(optionNumber === 1) {
            return `There is a ${Math.floor((this.trueProbability[1] ?? 0.9)*100)}% chance that this will damage a random human player.`;
        } else if(optionNumber === 2) {
            return `There is a ${Math.floor((this.trueProbability[2] ?? 0.85)*100)}% chance that this will deal 1 damage to the demon and 2 damage to everyone else.`;
        }
        return undefined;
    }

    override eventLikelihood(game: Game): number {
        const demonPlayer = this.players.find(p => p.isDemon);
        if(!demonPlayer || demonPlayer.health <= 0) {
            return 0;
        }
        return 1;
    }
}
