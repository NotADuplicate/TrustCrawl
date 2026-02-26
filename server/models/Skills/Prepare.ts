import { Skill } from '../skill';
import { Player } from '../player';
import { Cook, Craft, Endure, Forage, Haul, Hunt, Mend, Scavenge, Scout } from './';

export class Prepare extends Skill {
    private readonly skillPool: Skill[] = [
        new Scavenge(),
        new Scout(),
        new Forage(),
        new Haul(),
        new Mend(),
        new Hunt(),
        new Cook(),
        new Craft(),
        new Endure(),
    ];
    private selectedSkills: Skill[] = [];
    
    constructor() {
        super(
            'Prepare',
            'Pick 1 of five skills to have ready for the next floor.',
            false,
            ['key', 'shiv']
        );
        this.selectedSkills = this.pickSkills(5);
        this.options = this.selectedSkills.map(skill => skill.name);
    }

    override Use(player: Player, target?: Player, option?: string): string {
        if (!option) {
            return 'You must select a skill to prepare.';
        }
        const skill = this.selectedSkills.find(s => s.name === option);
        if (!skill) {
            return 'Invalid skill selected.';
        }
        player.preppedSkill = skill;
        return `You prepare the ${skill.name} skill for the next floor.`;
    }

    pickSkills(count: number): Skill[] {
        const pool = [...this.skillPool];
        const selected: Skill[] = [];
        while (selected.length < count && pool.length > 0) {
            const index = Math.floor(Math.random() * pool.length);
            selected.push(pool.splice(index, 1)[0]);
        }

        while (selected.length < count && this.skillPool.length > 0) {
            selected.push(this.skillPool[Math.floor(Math.random() * this.skillPool.length)]);
        }

        return selected;
    }
}