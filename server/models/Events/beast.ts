import { Event, EventResult } from '../event';
import { Player } from '../player';
export class Beast extends Event {
    health: number;
    hunger: number;
    constructor(players: Player[]) {
        let health = Math.floor(Math.random() * players.length) + 1;
        let hunger = Math.floor(Math.random() * players.length*1.5) + 1;
        super(
            'Beast',
            `A hungry beast stands in your way. Any players can attack the beast to deal a damage to it, or feed it.
            \n But if it survives and is still hungry it will deal 2 damage to ALL players.
            \nIt has between 1 and ${players.length} health and between 1 and ${Math.floor(players.length*1.5)+1} hunger.`,
            [
                {
                    description: 'Attack the beast. Take 1 damage and deal damage',
                    demonText: `The beast has ${health} health.`
                },
                {
                    description: 'Feed the beast. Give it an amount of food.',
                    demonText: `The beast has ${hunger} hunger.`,
                    quantity: true
                },
                {
                    description: 'Feed the beast. Give it an amount of raw meat.',
                    demonText: `The beast has ${hunger} hunger.`,
                    quantity: true
                },
                {
                    description: 'Wait around, if the beast is not killed or fed by other players, you will take 2 damage.',
                }
            ],
            'individual',
            players
        );
        this.health = health;
        this.hunger = hunger;
    }

    override isOptionAvailable(optionNumber: number, player: Player): boolean {
        if(optionNumber === 0) {
            return !player.wounded;
        }
        return true;
    }

    override optionSelected(optionNumber: number, player: Player, quantity?: number): EventResult {
        if (optionNumber === 0) {
            this.health -= player.dealDamage();
            player.damage(1);
            return { text: 'You attacked the beast!', color: 'info' };
        } else if(optionNumber === 1) {
            for(let i = 0; i < (quantity ?? 0); i++) {
                this.hunger -= 1;
                player.removeItem('Food');
            }
            return { text: `You fed the beast ${quantity} food!`, color: 'info' };
        } else if(optionNumber === 2) {
            for(let i = 0; i < (quantity ?? 0); i++) {
                this.hunger -= 1;
                player.removeItem('RawMeat');
            }
            return { text: `You fed the beast ${quantity} raw meat!`, color: 'info' };
        }
        return { text: 'You did nothing.', color: 'info' };
    }

    override optionQuantityMax(optionNumber: number, player: Player): number {
        if(optionNumber === 1) {
            return player.inventory.filter(item => item.name === 'Food').length;
        } else if(optionNumber === 2) {
            return player.inventory.filter(item => item.name === 'Raw Meat').length;
        }
        return 0;
    }

    override eventEnded(): EventResult {
        if(this.health > 0 && this.hunger > 0) {
            for(const player of this.players) {
                player.damage(2);
            }
            return { text: `The beast was not satisfied and attacks you all, dealing 2 damage.`, color: 'danger' };
        }
        else if(this.health <= 0) {
            return { text: `The beast has been slain, you are safe.`, color: 'success' };
        } else {
            return { text: `The beast has been fed, it wanders off in search of its next meal.`, color: 'success' };
        }
    }

    override isStabable(): string[] {
        return ['Beast'];
    }

    override stab(target: number): string {
        this.health -= 1;
        return `You stabbed the beast, dealing 1 damage!`;
    }
}