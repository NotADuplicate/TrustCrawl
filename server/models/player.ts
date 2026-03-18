import { Game } from '../game';
import { Item } from './item';
import { Body } from './Items/body';
import { Corpse } from './Items/corpse';
import { Skill } from './skill';

export class Player {
    public inventory: Item[] = [];
    public health = 3;
    public stamina = 3;
    public maxStamina = 3;
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
    public isDemon = false;
    public disturbed = false;
    public confused = false;
    public investigating = false;
    public lastSkills: Skill[] = [];
    public carryingCapacity = 8;
    public skillModifier = 0;

    constructor(public name: string, game: Game) {
        this.game = game;
    }

    addItem(item: Item): void {
        if (this.health < 0) {
            this.game.floorItems.push(item);
            return;
        }

        if (this.health === 0) {
            const canCarryFood = item.name === 'Food' && this.inventory.filter((entry) => entry.name === 'Food').length < 2;
            if (!canCarryFood) {
                this.game.floorItems.push(item);
                return;
            }
        }

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
        if (this.dead) {
            return;
        }

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
            this.kill();
        } else if(this.health === 0 && !this.wounded) {
            console.log(`${this.name} is unconscious.`);
            this.wounded = true;
            this.dead = false;
            this.game.floorItems.push(...this.inventory);
            this.inventory = [];
            this.ensureBodyMarker();
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
        if (this.health > 0) {
            this.wounded = false;
            this.removeBodyMarker();
        }
    }

    kill(): void {
        if (this.dead) {
            return;
        }

        this.health = -1;
        this.dead = true;
        this.wounded = false;
        this.removeBodyMarker();
        this.game.floorItems.push(...this.inventory);
        this.game.floorItems.push(new Corpse(this));
        this.inventory = [];
        console.log(`${this.name} has died.`);
    }

    bodyItemName(): string {
        return `${this.name}'s Body`;
    }

    canInfluenceGame(): boolean {
        return this.health >= 0;
    }

    private ensureBodyMarker(): void {
        const bodyName = this.bodyItemName();
        const hasBodyOnFloor = this.game.floorItems.some((item) => item.name === bodyName);
        const hasBodyInInventory = this.game.players.some((player) =>
            player.inventory.some((item) => item.name === bodyName),
        );
        if (!hasBodyOnFloor && !hasBodyInInventory) {
            this.game.floorItems.push(new Body(this));
        }
    }

    private removeBodyMarker(): void {
        const bodyName = this.bodyItemName();
        this.game.floorItems = this.game.floorItems.filter((item) => item.name !== bodyName);
        for (const player of this.game.players) {
            player.inventory = player.inventory.filter((item) => item.name !== bodyName);
        }
    }
}
