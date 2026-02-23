import { Event, EventResult } from '../event';
import { Player } from '../player';
export class Rubble extends Event {
    constructor(players: Player[]) {
        super(
            'Rubble',
            'A cave-in blocks the path and demands a choice.',
            [
                {
                    description: 'Use up a tool to clear the rubble.',
                },
                {
                    description: 'Clear the rubble with your hands and take 1 damage.',
                }
            ],
            'individual',
            players
        );
    }

    override isOptionAvailable(optionNumber: number, player: Player): boolean {
        const hasTool = player.inventory.some(item => item.name === 'Tool' || item.name === 'Shovel');

        if (optionNumber === 0) {
            return hasTool;
        } else if (optionNumber === 1) {
            return true;
        }

        return false;
    }

    override optionSelected(optionNumber: number, player: Player): EventResult {
        if (optionNumber === 0) {
            const hasShovel = player.inventory.some(item => item.name === 'Shovel');
            if (!hasShovel) {
                player.removeItem('Tool');
                return { text: 'You used a tool to clear the rubble!', color: 'info' };
            }
            return { text: 'You used a shovel to clear the rubble without taking damage!', color: 'success' };
        } else if (optionNumber === 1) {
            player.damage(1);
            return { text: 'You cleared the rubble with your hands and took 1 damage!', color: 'danger' };
        }
        return { text: '', color: 'info' };
    }
}