import { Skill } from '../skill';
import { Player } from '../player';
import { Food } from '../Items/Supplies/food';
export class Forage extends Skill {
    override getInfo(player: Player) {
        return {
            name: 'Forage',
            description: `Gain 1d4${player.skillModifier > 0 ? ` + ${player.skillModifier}` : ''} food.`,
            targeted: false,
            options: [],
            optionTooltips: {}
        };
    }

    override Use(player: Player): string {
        const foodGained = Math.floor(Math.random() * 4) + 1 + player.skillModifier;
        for(let i = 0; i < foodGained; i++) {
            player.addItem(new Food());
        }
        return `You gained ${foodGained} food.`;
    }
}