import { Game } from '../../game';
import { Event, EventResult } from '../event';
import { Item } from '../item'
import { Tea } from '../Items/Equipment';
import { Bandadge } from '../Items/Equipment/bandadge';
import { Food } from '../Items/Supplies/food';
import { Gold } from '../Items/Supplies/gold';
import { Key } from '../Items/Supplies/key';
import { Tool } from '../Items/Supplies/tool';
import { Player } from '../player';
export class Traps extends Event {
    trappedOption: number;
    bags: Item[][] = [];
    constructor(players: Player[]) {
        const trappedOption = Math.floor(Math.random() * 3);
        super(
            'Free Supplies',
            `3 bags of free supplies lie in front of the group.
            \nYour instincts tell you that one of them is trapped, but you can't tell which one.`,
            [],
            'group',
            players
        );

        this.trappedOption = trappedOption;
        for(let i = 0; i < 3; i++) {
            this.bags.push(this.generateBag());
        }
        this.options = this.bags.map((bagContents, index) => ({
            description: `${this.generateOptionText(bagContents)}.`,
            demonText: index === trappedOption ? 'This bag is trapped!' : undefined
        }));
    }

    override optionSelected(optionNumber: number, player: Player, quantity?: number): EventResult {
        console.log('Option selected:', optionNumber, 'Trapped option:', this.trappedOption);
        if(optionNumber === this.trappedOption) {
            for(const p of this.players) {
                p.damage(1);
            }
            return { text: 'Oh no! The bag was trapped and you took 1 damage.', color: 'danger' };
        } else {
            const bagContents = this.bags[optionNumber];
            for(const item of bagContents) {
                this.game?.floorItems.push(item);
            }
        }
        return { text: 'You picked a safe bag and got some free supplies!', color: 'success' };
    }

    generateBag(): Item[] {
        const bagContents: Item[] = [];
        const supplyList = [
            new Food(),
            new Tool(),
            new Bandadge(),
            new Tea(),
            new Gold(),
            new Key(),
        ];
        let bagValue = 0.75 + Math.random();
        while(bagValue > 0.2) {
            const item = supplyList[Math.floor(Math.random() * supplyList.length)];
            if(item.value > bagValue + 0.40) continue;
            if(bagValue - item.value < 0.2 && bagValue - item.value > 0) continue;
            bagContents.push(item);
            bagValue -= item.value;
        }
        return bagContents;
    }

    generateOptionText(bagContents: Item[]): string {
        const itemCounts: { [key: string]: number } = {};
        for(const item of bagContents) {
            itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
        }
        const itemDescriptions = Object.entries(itemCounts).map(([name, count]) => `${count} ${name}`);
        return itemDescriptions.join(', ');
    }

    override eventLikelihood(game: Game): number {
        return 2;
    }
}