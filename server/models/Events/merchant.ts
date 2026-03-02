import { Game } from '../../game';
import { Event, EventResult } from '../event';
import { Item } from '../item';
import {  } from '../Items/Equipment';
import { Food } from '../Items/Supplies/food';
import { Key } from '../Items/Supplies/key';
import { Tool } from '../Items/Supplies/tool';
import { Balloon, Tea, Satchel, Club, HeavyClub, Shovel, Armor } from '../Items/Equipment';
import { Player } from '../player';
import { Firewood } from '../Items/Supplies/firewood';
import { Shiv } from '../Items/Supplies/shiv';

type Sale = {
    item: Item;
    quantity: number;
    price: number;
}
export class Merchant extends Event {
    sales: Sale[] = [];
    private readonly soldOutOptions = new Set<number>();
    constructor(players: Player[]) {
        super(
            'Merchant',
            `A humble merchant offers you her wares.`,
            [],
            'individual',
            players
        );
        const numOfferings = 4;
        for(let i = 0; i < numOfferings; i++) {
            let newSale = this.pickItemToSell();
            while(this.sales.some((sale) => sale.item.name === newSale.item.name)) {
                newSale = this.pickItemToSell();
            }
            this.sales.push(newSale);
        }
        this.options = [
            {
                description: 'Leave the merchant alone and continue on your way.',
            },
            ...this.sales.map((sale) => ({
                description: `Buy ${sale.quantity} ${sale.item.name}(s) for ${sale.price} gold.`,
                repeatable: true
            }))
        ]   
    }

    override isOptionAvailable(optionNumber: number, player: Player): boolean {
        if(optionNumber === 0) return true;
        if(this.soldOutOptions.has(optionNumber)) return false;
        const sale = this.sales[optionNumber - 1];
        const goldCount = player.inventory.filter((item) => item.name === 'Gold').length;
        const hasGold = goldCount >= sale.price;
        return hasGold;
    }

    override optionSelected(optionNumber: number, player: Player, quantity?: number): EventResult {
        if(optionNumber === 0) {
            return { text: 'You leave the merchant alone and continue on your way.', color: 'info' };
        }
        const sale = this.sales[optionNumber - 1];
        for(let i = 0; i < sale.price; i++) {
            player.removeItem('Gold');
        }
        for(let i = 0; i < sale.quantity; i++) {
            player.addItem(sale.item);
        }
        this.soldOutOptions.add(optionNumber);
        this.update();
        return { text: 'You bought the item.', color: 'success' };
    }

    pickItemToSell(): Sale {
        if(Math.random() < 0.5) {
            console.log('Merchant is selling supplies.');
            const supplies = [Food, Key, Tool, Shiv];
            const supplyType = supplies[Math.floor(Math.random() * supplies.length)];
            const item = new supplyType();
            const price = item.value * (0.7 + Math.random()*0.7);
            const quantity = supplyType === Food ? Math.floor(Math.random() * 4) + 2 : Math.floor(Math.random() * 3)+1;
            return { item, quantity, price: Math.round(price * quantity) };
        }
        console.log('Merchant is selling equipment.');
        const items = [Balloon, Tea, Satchel, Club, HeavyClub, Armor, Shovel, Firewood];
        const sellable = items.filter((item) => item != null);
        const index = Math.floor(Math.random() * sellable.length);
        const itemType = sellable[index];
        const item = new itemType();
        const price = Math.round(item.value * (0.7 + Math.random()*0.7));
        return { item, quantity: 1, price };
    }

    override eventLikelihood(game: Game): number {
        if(game.level > 2) {
            //get the sum of all players money
            const totalGold = game.players.reduce((total, player) => {
                const goldCount = player.inventory.filter((item) => item.name === 'Gold').length;
                const hasTreasure = player.inventory.some((item) => item.name === 'Treasure');
                return total + goldCount + (hasTreasure ? 3 : 0);
            }, 0);
            return 0.5+3*totalGold/game.players.filter((player) => player.health > 0).length;
        }
        return 0;
    }
}
