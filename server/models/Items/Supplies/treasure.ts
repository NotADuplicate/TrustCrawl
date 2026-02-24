import { Item } from '../../item';
export class Treasure extends Item {
    constructor(value: number) {
        super('Treasure', 'A valuable treasure that can be sold at a shop!', 1, value)
     }
}