import { Game } from '../../game';
import { Event, EventResult } from '../event';
import { Player } from '../player';
import { Gold } from '../Items/Supplies/gold';

export class Cleric extends Event {
    constructor(players: Player[]) {
        super(
            'Cleric',
            `A cleric offers you magical blessings... for a price.`,
            [
                {
                    description: 'Leave the cleric alone and continue on your way.',
                },
                {
                    description: 'Heal 1 health. 1 gold.',
                    repeatable: true
                },
                {
                    description: 'Increase max health by 1. 2 gold.',
                    repeatable: true
                },
                {
                    description: 'Increase max stamina by 1. 1 gold.',
                    repeatable: true
                },
                {
                    description: 'Sacrifice: Take 2 damage, gain 1 gold.',
                    repeatable: true
                }
            ],
            'individual',
            players
        );
    }

    override isOptionAvailable(optionNumber: number, player: Player): boolean {
        if(optionNumber === 0) return true;
        const goldCount = player.inventory.filter((item) => item.name === 'Gold').length;
        if(optionNumber === 1) {
            return goldCount >= 1 && player.health < player.maxHealth;
        }
        if(optionNumber === 2) {
            return goldCount >= 2;
        }
        if(optionNumber === 3) {
            return goldCount >= 1;
        }
        return true;
    }

    override optionSelected(optionNumber: number, player: Player, quantity?: number): EventResult {
        if(optionNumber === 0) {
            return { text: 'You leave the cleric alone and continue on your way.', color: 'info' };
        }
        if(optionNumber === 1) {
            player.heal(1);
            player.removeItem('Gold');
            return { text: 'You pay the cleric 1 gold and heal 1 health.', color: 'success' };
        }
        if(optionNumber === 2) {
            player.maxHealth += 1;
            player.removeItem('Gold');
            player.removeItem('Gold');
            return { text: 'You pay the cleric 2 gold and increase your max health by 1.', color: 'success' };
        }
        if(optionNumber === 3) {
            player.maxStamina += 1;
            player.removeItem('Gold');
            return { text: 'You pay the cleric 1 gold and increase your max stamina by 1.', color: 'success' };
        }
        player.addItem(new Gold());
        player.damage(2, false);
        return { text: 'You sacrifice your health to the cleric and gain 2 gold.', color: 'success' };
    }

    override eventLikelihood(game: Game): number {
        if(game.level > 2) {
            //get the sum of all players money
            const totalGold = game.players.reduce((total, player) => {
                const goldCount = player.inventory.filter((item) => item.name === 'Gold').length;
                const hasTreasure = player.inventory.some((item) => item.name === 'Treasure');
                return total + goldCount + (hasTreasure ? 3 : 0);
            }, 0);
            return 1+totalGold/game.players.filter((player) => player.health > 0).length;
        }
        return 0;
    }
}