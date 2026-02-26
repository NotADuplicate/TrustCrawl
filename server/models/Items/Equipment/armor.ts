import { Item } from '../../item';
export class Armor extends Item {
    constructor() {
        super('Armor', 'Anytime you would take 2 or more damage at once, take 1 damage instead.', 3, 1.8)
     }
}