import { Game } from '../../game';
import { Event, EventResult } from '../event';
import { Player } from '../player';
export class HotSpring extends Event {
    watchers: Player[] = [];
    constructor(players: Player[]) {
        let failure = Math.random() < 0.15;
        super(
            'Hot Spring',
            `Nice fresh water! But someone has to stay behind to watch out for monsters.`,
            [
                {
                    description: 'Hop on in! Enjoy the warm water and heal 1 hp. If no one is keeping watch you will take 1 damage instead.',
                },
                {
                    description: 'Stay behind and keep watch for monsters.',
                }
            ],
            'individual',
            players
        );
    }

    override optionSelected(optionNumber: number, player: Player): EventResult {
        if(optionNumber === 0) {
            return { text: 'The warm water feels soothing. Hopefully someone is keeping you safe while you relax.', color: 'info' };
        } else {
            this.watchers.push(player);
            return { text: 'As much as you want to relax, you stay vigilant and keep watch for monsters.', color: 'info' };
        }
    }

    override eventEnded(): EventResult {
        if(this.watchers.length === 0) {
            for(const player of this.players) {
                player.damage(1);
            }
            return { text: 'No one kept watch! Everyone took 1 damage!', color: 'danger' };
        }
        for(const player of this.players) {
            if(!this.watchers.includes(player)) {
                player.heal(1);
            }
        }
        return { text: 'Some players kept watch and repelled the monsters!', color: 'warning' };
    }

    override eventLikelihood(game: Game): number {
        return game.floor > 3 ? 1 : 0
    }
}