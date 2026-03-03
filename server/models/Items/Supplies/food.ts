import { Item } from '../../item';
export class Food extends Item {
    poisoned: boolean = false;
    constructor() {
        super('Food', 'A simple ration.', 1, 0.4)
     }
}
