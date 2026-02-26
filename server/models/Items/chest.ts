import { Game } from '../../game';
import { Item } from '../item';
import { Player } from '../player';
import { Balloon, Tea, Satchel, Club, HeavyClub, Shovel, Armor } from './Equipment';
import { Gold } from './Supplies/gold';
export class Chest extends Item {
    constructor(value: number) {
        let grade: string;
        if(value > 5) {
            grade = 'Gold';
        } else if(value > 2) {
            grade = 'Silver';
        } else {
            grade = 'Bronze';
        }
        super(`${grade} Chest`, 'A mysterious chest containing valuable items.', 5, value);
     }

     override use(game: Game, player: Player): string {
        console.log(`Using chest with value ${this.value}`);
        let rewards = this.value;
        const items = [Balloon, Tea, Satchel, Club, HeavyClub, Armor, Shovel];
        while(rewards > 0) {
            if(Math.random() < 0.4) {
                for(let i = rewards; i > 0; i--) {
                    player.addItem(new Gold());
                }
                rewards = 0;
            }
            const ItemClass = items[Math.floor(Math.random() * items.length)];
            const item = new ItemClass();
            if(item.value <= rewards) {
                player.addItem(item);
                rewards -= item.value;
            } else {
                for(let i = rewards; i > 0; i--) {
                    player.addItem(new Gold());
                }
                rewards = 0;
            }
        }
        player.removeItem(this.name);
        return `You opened a ${this.name} and received some rewards.`;
    }
    }