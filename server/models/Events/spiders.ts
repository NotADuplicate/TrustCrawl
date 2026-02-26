import { Game } from '../../game';
import { Event, EventResult } from '../event';
import { Food } from '../Items/Supplies/food';
import { Player } from '../player';
export class Spiders extends Event {
    health1: number;
    health2: number;
    foodAmount: number;
    goldAmount: number;
    willDamage: boolean;
    constructor(players: Player[]) {
        const health1 = Math.floor(Math.random() * (players.length - 1)) + 1;
        const health2 = Math.floor(Math.random() * (players.length - 1)) + 1;
        const foodAmount = Math.floor(Math.random() * players.length)*2;
        const goldAmount = Math.floor(Math.random() * players.length);
        const willDamage = Math.random() < 1/3;
        super(
            'Spiders',
            `You see 2 large spiders guarding their own hoards of food and gold.
            \n Any players can attack either spider to deal damage to it.
            \n The first spider guards between 0 and ${players.length*2} food.
            \n The second spider guards between 0 and ${players.length} gold.
            \n Each spider has between 1 and ${players.length-1} health.`,
            [
                {
                    description: 'Attack the spider guarding the food. Take 1 damage and deal damage',
                    demonText: `The first spider has ${health1} health and guards ${foodAmount} food.`
                },
                {
                    description: 'Attack the spider guarding the gold. Take 1 damage and deal damage',
                    demonText: `The second spider has ${health2} health and guards ${goldAmount} gold.`
                },
                {
                    description: 'Try to walk around them. 1/3rd chance you get attacked anyways and take 1 damage.',
                    demonText: willDamage ? 'The spiders will attack!' : 'They will not attack.'
                }
                ],
            'individual',
            players
        );
        this.health1 = health1;
        this.health2 = health2;
        this.foodAmount = foodAmount;
        this.goldAmount = goldAmount;
        this.willDamage = willDamage;
    }

    override isOptionAvailable(optionNumber: number, player: Player): boolean {
        if(optionNumber !== 2) {
            return !player.wounded;
        }
        return true;
    }

    override optionSelected(optionNumber: number, player: Player, quantity?: number): EventResult {
        if (optionNumber === 0) {
            this.health1 -= player.dealDamage();
            player.damage(1);
            return { text: 'You attacked the first spider!', color: 'info' };
        } else if (optionNumber === 1) {
            this.health2 -= player.dealDamage();
            player.damage(1);
            return { text: 'You attacked the second spider!', color: 'info' };
        } else {
            if(this.willDamage) {
                player.damage(1);
                return { text: 'You tried to walk around the spiders, but they attacked you!', color: 'danger' };
            }
            return { text: 'You tried to walk around the spiders, and they did not attack you!', color: 'success' };
        }
    }

    override eventEnded(): EventResult {
        if(this.health1 <= 0) {
            this.game?.floorItems.push(...Array(this.foodAmount).fill(new Food()));
        }
        if(this.health2 <= 0) {
            this.game?.floorItems.push(...Array(this.goldAmount).fill({ name: 'Gold' }));
        }
        if(this.health1 <= 0 && this.health2 <= 0) {
            return { text: `You killed both spiders and gathered ${this.foodAmount} food and ${this.goldAmount} gold!`, color: 'success' };
        } else if(this.health1 <= 0) {
            return { text: `You killed the first spider and gathered ${this.foodAmount} food!`, color: 'success' };
        } else if(this.health2 <= 0) {
            return { text: `You killed the second spider and gathered ${this.goldAmount} gold!`, color: 'success' };
        } else {
            return { text: 'The spiders survive to run away.', color: 'info' };
        }
    }

    override eventLikelihood(game: Game): number {
        return game.level > 3 ? 2 : 1;
    }   

    override isStabable(): string[] {
        return ['Gold Spider', 'Food Spider'];
    }

    override stab(target: number): string {
        if(target === 1) {
            this.health1 -= 1;
            return `You stabbed the food spider, dealing 1 damage!`;
        }
        this.health2 -= 1;
        return `You stabbed the gold spider, dealing 1 damage!`;
    }
}