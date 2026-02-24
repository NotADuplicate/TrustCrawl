import { Game } from '../../game';
import { Event, EventResult } from '../event';
import { Item } from '../item';
import {  } from '../Items/Equipment';
import { Food } from '../Items/Supplies/food';
import { Key } from '../Items/Supplies/key';
import { Tool } from '../Items/Supplies/tool';
import { Player } from '../player';

type Sale = {
    item: Item;
    quantity: number;
    price: number;
}
export class Merchant extends Event {
    sales: Sale[] = [];
    constructor(players: Player[]) {
        super(
            'Merchant',
            `A humble merchant offers you her wares.`,
            [],
            'individual',
            players
        );
        const numOfferings = Math.floor(Math.random() * 2) + 3;
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
                description: `Buy ${sale.quantity} ${sale.item.name}(s) for ${sale.price} gold.`
            }))
        ]   
    }

    override isOptionAvailable(optionNumber: number, player: Player): boolean {
        if(optionNumber === 0) return true;
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
        return { text: `You buy ${sale.quantity} ${sale.item.name}(s) for ${sale.price} gold.`, color: 'success' };
    }

    pickItemToSell(): Sale {
        if(Math.random() < 0.5) {
            const supplies = [Food, Key, Tool];
            const supplyType = supplies[Math.floor(Math.random() * supplies.length)];
            const item = new supplyType();
            const price = item.value * (0.7 + Math.random()*0.7);
            const quantity = supplyType === Food ? Math.floor(Math.random() * 4) + 1 : Math.floor(Math.random() * 3);
            return { item, quantity, price: Math.round(price * quantity) };
        }
        const items = Object.values(require('../Items/Equipment')) as Item[];
        const sellable = items.filter((item) => item != null);
        const index = Math.floor(Math.random() * sellable.length);
        const item = sellable[index];
        const price = Math.round(item.value * (0.7 + Math.random()*0.7));
        return { item, quantity: 1, price };
    }

    override eventLikelihood(game: Game): number {
        return game.floor > 3 ? 2 : 0
    }
}