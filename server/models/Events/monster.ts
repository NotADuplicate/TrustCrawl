import { runInThisContext } from 'vm';
import { Game } from '../../game';
import { Event, EventResult } from '../event';
import { Item } from '../item';
import { Satchel, Tea } from '../Items/Equipment';
import { Bandadge } from '../Items/Equipment/bandadge';
import { Firewood } from '../Items/Supplies/firewood';
import { Gold } from '../Items/Supplies/gold';
import { Key } from '../Items/Supplies/key';
import { Shiv } from '../Items/Supplies/shiv';
import { Player } from '../player';
export class Monster extends Event {
    health: number;
    treasureAmount: number;
    constructor(players: Player[]) {
        let health = Math.floor(Math.random() * players.length) + 2;
        let treasureAmount = Math.floor(Math.random() * players.length);
        super(
            'Monster',
            `Any players can attack the monster to deal a damage to it, but if it survives it will deal an extra damage to ALL players.
            \nIt has between 2 and ${players.length+1} health. If killed it will drop between 0 and ${players.length-1} items on the floor.`,
            [
                {
                    description: 'Attack the monster. Take 1 damage and deal damage',
                    selectedText: 'You attacked the monster!',
                    demonText: `The monster has ${health} health. It will drop ${treasureAmount} items when killed.`
                },
                {
                    description: 'Wait around, if the monster is not killed by other players, you will take 1 damage.',
                    selectedText: 'You did nothing.',
                }
            ],
            'individual',
            players
        );
        this.health = health;
        this.treasureAmount = treasureAmount;
    }

    override optionSelected(optionNumber: number, player: Player): EventResult {
        if (optionNumber === 0) {
            this.health -= player.dealDamage();
            player.damage(1);
            return { text: 'You attacked the monster!', color: 'info' };
        }
        return { text: 'You did nothing.', color: 'info' };
    }

    override getOptionInvestigationText(optionNumber: number, player: Player): string | undefined {
        const healthRange = this.players.length/2;
        const minHealth = Math.floor(Math.max(2, this.health - this.seededRandom(player) * healthRange));
        const maxHealth = Math.floor(Math.min(this.players.length+1, this.health + (1 - this.seededRandom(player)) * healthRange));

        if(optionNumber === 0) {
            return `The beast has between ${minHealth} and ${maxHealth} health. It will drop ${this.treasureAmount} items when killed.`;
        }
        return undefined;
    }

    override eventEnded(): EventResult {
        if(this.health > 0) {
            for(const player of this.players) {
                player.damage(1);
            }
            return { text: 'The monster survived and dealt 1 damage to all players!', color: 'danger' };
        }
        const treasureOptions = [Gold, Firewood, Shiv, Key, Bandadge, Tea, Satchel];
        const treasures: Item[] = [];
        for(let i = 0; i < this.treasureAmount; i++) {
            const TreasureClass = treasureOptions[Math.floor(Math.random() * treasureOptions.length)];
            treasures.push(new TreasureClass());
        }
        return { text: `The monster was defeated! It dropped ${treasures.map(t => t.name).join(', ')}.`, color: 'success' };
    }

    override isOptionAvailable(optionNumber: number, player: Player): boolean {
        if(optionNumber === 1) {
            return !player.wounded;
        }
        return true;
    }

    override eventLikelihood(game: Game): number {
        return 2.5;
    }

    override isStabable(): string[] {
        return ['Monster'];
    }

    override stab(target: number): string {
        this.health -= 1;
        return `You stabbed the monster, dealing 1 damage!`;
    }
}
