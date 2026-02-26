import { Game } from '../game';
import { Item } from './item';
import { Body } from './Items/body';
import { Skill } from './skill';

export class Player {
    public inventory: Item[] = [];
    public health = 3;
    public stamina = 3;
    public hauling = false;
    public maxHealth = 3;
    public wellFed = false;
    public sleeping = true;
    public enduring = false;
    public scouting: 'left' | 'right' | 'neither' | 'both' = 'neither';
    public game: Game;
    public wounded = false;
    public dead = false;
    public preppedSkill: Skill | null = null;

    constructor(public name: string, game: Game) {
        this.game = game;
    }

    addItem(item: Item): void {
        this.inventory.push(item);
    }

    removeItem(itemName: string): Item | undefined {
        const index = this.inventory.findIndex((item) => item.name === itemName);
        if (index === -1) {
            return undefined;
        }

        return this.inventory.splice(index, 1)[0];
    }

    damage(amount: number, combat: boolean = true): void {
        if(amount > 1 && this.inventory.some(item => item.name === 'Armor')) {
            console.log('Armor reduces damage to 1.');
            amount = 1;
        }
        console.log(`${this.name} takes ${amount} damage.`);
        if(this.enduring) {
            console.log(`${this.name} is enduring and loses stamina instead of health.`);
            const staminaLoss = Math.min(this.stamina, amount);
            this.stamina -= staminaLoss;
            amount -= staminaLoss;
        }

        this.health = this.health - amount;
        if(this.health < 0) {
            this.game.floorItems.push(...this.inventory);
            this.dead = true;
            console.log(`${this.name} has died.`);
        } else if(this.health === 0) {
            console.log(`${this.name} is unconscious.`);
            this.wounded = true;
            this.game.floorItems.push(...this.inventory);
            this.inventory = [];
            this.game.floorItems.push(new Body(this));
        }
    }

    dealDamage(): number {
        if(this.inventory.some(item => item.name === 'Heavy Club')) {
            return 3;
        }
        if(this.inventory.some(item => item.name === 'Club')) {
            return 2;
        }
        return 1;
    }

    heal(amount: number): void {
        if(this.dead) {
            return;
        }
        console.log(`${this.name} heals ${amount} health.`);
        this.health = Math.min(this.health + amount, this.maxHealth);
    }
}
