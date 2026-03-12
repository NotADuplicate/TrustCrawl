import { Game } from '../../game';
import { Event, EventResult } from '../event';
import { Food } from '../Items/Supplies/food';
import { Gold } from '../Items/Supplies/gold';
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
        const foodAmount = Math.floor(Math.random() * players.length)*2 + 1;
        const goldAmount = Math.floor(Math.random() * players.length) + 1;
        const willDamage = Math.random() < 1/3;
        super(
            'Spiders',
            `You see 2 large spiders guarding their own hoards of food and gold.
            \n Any players can attack either spider to deal damage to it.
            \n The first spider guards between 1 and ${players.length*2} food.
            \n The second spider guards between 1 and ${players.length} gold.
            \n Each spider has between 1 and ${players.length-1} health.`,
            [
                {
                    description: 'Attack the spider guarding the food. Take 1 damage and deal damage',
                    selectedText: 'You attacked the first spider!',
                    demonText: `The first spider has ${health1} health and guards ${foodAmount} food.`
                },
                {
                    description: 'Attack the spider guarding the gold. Take 1 damage and deal damage',
                    selectedText: 'You attacked the second spider!',
                    demonText: `The second spider has ${health2} health and guards ${goldAmount} gold.`
                },
                {
                    description: 'Try to walk around them. 1/3rd chance you get attacked anyways and take 1 damage.',
                    selectedText: `You try to walk around the spiders!`,
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
            this.game?.floorItems.push(...Array(this.goldAmount).fill(new Gold()));
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

    override getOptionInvestigationText(optionNumber: number, player: Player): string | undefined {
        const healthRange = (this.players.length/2)-1;

        if(optionNumber === 0) {
            const minHealth1 = Math.floor(Math.max(1, this.health1 - this.seededRandom(player) * healthRange));
            const maxHealth1 = Math.floor(Math.min(this.players.length, this.health1 + (1 - this.seededRandom(player)) * healthRange));
            const foodRange = this.players.length;
            const minFood = Math.floor(Math.max(1, this.foodAmount - this.seededRandom(player,'food') * foodRange));
            const maxFood = Math.floor(Math.min(this.players.length*2, this.foodAmount + (1 - this.seededRandom(player,'food')) * foodRange));
            return `It has between ${minHealth1} and ${maxHealth1} health. It guards between ${minFood} and ${maxFood} food.`;
        }
        if(optionNumber === 1) {
            const minHealth2 = Math.floor(Math.max(1, this.health2 - this.seededRandom(player,'1') * healthRange));
            const maxHealth2 = Math.floor(Math.min(this.players.length, this.health2 + (1 - this.seededRandom(player,'1')) * healthRange));
            const goldRange = this.players.length/2;
            const minGold = Math.floor(Math.max(1, this.goldAmount - this.seededRandom(player,'gold') * goldRange));
            const maxGold = Math.floor(Math.min(this.players.length, this.goldAmount + (1 - this.seededRandom(player,'gold')) * goldRange));
            return `It has between ${minHealth2} and ${maxHealth2} health. It guards between ${minGold} and ${maxGold} gold.`;
        }
        return undefined;
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
