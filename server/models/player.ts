import { Item } from './item';

export class Player {
    public inventory: Item[] = [];
    public health = 3;
    public stamina = 3;
    public hauling = false;
    public maxHealth = 3;
    public scouting: 'left' | 'right' | 'neither' = 'neither';

    constructor(public name: string) { }

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

    damage(amount: number): void {
        console.log(`${this.name} takes ${amount} damage.`);
        this.health = Math.max(this.health - amount, 0);
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
        console.log(`${this.name} heals ${amount} health.`);
        this.health = Math.min(this.health + amount, this.maxHealth);
    }
}
