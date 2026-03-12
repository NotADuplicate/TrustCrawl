import { Game } from '../../game';
import { Event, EventResult } from '../event';
import { Player } from '../player';
export class SplitUp extends Event {
    firstPlayerDamaged: boolean;
    endangeredGroup: number;
    group1: Player[];
    group2: Player[];
    constructor(players: Player[]) {
        const group1 = players.slice(0, players.length / 2);
        const group2 = players.slice(players.length / 2);
        super(
            'Split Up!',
            `Your group has gotten split up in the darkness! Which group should seek shelter and which should try to find them?`,
            [
                {
                    description: `${group1.map(p => p.name).join(' and ')} will make the dangerous journey.
                    \n One of them will take 1 or 2 damage.`,
                },
                {
                    description: `${group2.map(p => p.name).join(' and ')} will make the dangerous journey.
                    \n One of them will take 1 or 2 damage.`,
                }
            ],
            'group',
            players
        );
        this.firstPlayerDamaged = this.getRandom(0.5);
        this.endangeredGroup = this.getRandom(0.5, 1) ? 1 : 2;
        const group1Damage = this.endangeredGroup === 1 ? 2 : 1;
        const group2Damage = this.endangeredGroup === 2 ? 2 : 1;
        this.options[0].demonText = this.firstPlayerDamaged ? `${group1[0].name} will take ${group1Damage} damage!` : `${group1[1].name} will take ${group1Damage} damage!`;
        this.options[1].demonText = this.firstPlayerDamaged ? `${group2[0].name} will take ${group2Damage} damage!` : `${group2[1].name} will take ${group2Damage} damage!`;
        this.group1 = group1;
        this.group2 = group2;
    }

    override optionSelected(optionNumber: number, player: Player, quantity?: number): EventResult {
        if(optionNumber == 0) {
            if(this.group1.length < 2) {
                this.players[0].damage(this.endangeredGroup === 1 ? 2 : 1);
                return { text: `${this.players[0].name} took ${this.endangeredGroup === 1 ? 2 : 1} damage while trying to find shelter!`, color: 'danger' };
            }
            const damagedPlayer = this.firstPlayerDamaged ? this.players[0] : this.players[1];
            damagedPlayer.damage(this.endangeredGroup === 1 ? 2 : 1);
            return { text: `${damagedPlayer.name} took ${this.endangeredGroup === 1 ? 2 : 1} damage while trying to find shelter!`, color: 'danger' };
        } else {
            const damagedPlayer = this.firstPlayerDamaged ? this.players[2] : this.players[3];
            damagedPlayer.damage(this.endangeredGroup === 2 ? 2 : 1);
            return { text: `${damagedPlayer.name} took ${this.endangeredGroup === 2 ? 2 : 1} damage while trying to find shelter!`, color: 'danger' };
        }
    }

    override getOptionInvestigationText(optionNumber: number, player: Player): string | undefined {
        if(optionNumber === 0) {
            return `There is a ${Math.floor((this.trueProbability[1] ?? 0.5)*100)}% chance that this will result in 2 damage.
            \n ${Math.floor((this.trueProbability[0] ?? 0.5)*100)}% chance that ${this.players[0].name} is the one at risk.`;
        } else if(optionNumber === 1) {
            return `There is a ${Math.floor((1-(this.trueProbability[1] ?? 0.5))*100)}% chance that this will result in 2 damage.
            \n ${Math.floor((this.trueProbability[0] ?? 0.5)*100)}% chance that ${this.group2[0].name} is the one at risk.`;
        }
        return undefined;
    }

    override eventLikelihood(game: Game): number {
        if(game.level < 4) {
            return 0;
        }
        return game.players.filter(p => p.health > 1).length == 4 ? 2 : 0;
    }
}
