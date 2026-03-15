import { Skill } from '../skill';
import { Player } from '../player';
import { Cook, Craft, Endure, Forage, Haul, Hunt, Mend, Scavenge, Scout, Train } from './';

export class Prepare extends Skill {
    private readonly skillPool: Skill[] = [
        new Scavenge(),
        new Forage(),
        new Hunt(),
        new Mend(),
        new Endure(),
        new Cook(),
        new Craft(),
        new Haul(),
        new Scout(),
        new Train()
    ];
    private readonly selectedSkillsByPlayer = new WeakMap<Player, Skill[]>();

    override getInfo(player: Player) {
        console.log("Getting info for prepare")
        const selectedSkills = this.pickSkills(player.skillModifier + 4, player);
        this.selectedSkillsByPlayer.set(player, selectedSkills);
        return {
            name: 'Prepare',
            description: `Pick 1 of ${player.skillModifier + 4} skills to have ready for the next floor.`,
            targeted: false,
            options: selectedSkills.map(skill => skill.getInfo(player).name),
            optionTooltips: Object.fromEntries(
                selectedSkills.map((skill) => [skill.getInfo(player).name, skill.getInfo(player).description]),
            )
        };
    }

    override Use(player: Player, target?: Player, option?: string): string {
        console.log('Selected skills for player:', this.selectedSkillsByPlayer.get(player)?.map(s => s.getInfo(player).name));
        if (!option) {
            console.log('No skill option selected.');
            return 'You must select a skill to prepare.';
        }
        const selectedSkills = this.selectedSkillsByPlayer.get(player) ?? [];
        const skill = selectedSkills.find(s => s.getInfo(player).name === option);
        if (!skill) {
            console.log('Invalid skill selected:', option);
            return 'Invalid skill selected.';
        }
        player.preppedSkill = skill;
        this.selectedSkillsByPlayer.delete(player);
        return `You prepare the ${skill.getInfo(player).name} skill for the next floor.`;
    }

    pickSkills(count: number, player: Player): Skill[] {
        const pool = [...this.skillPool];
        const selected: Skill[] = [];
        while (selected.length < count && pool.length > 0) {
            const index = Math.floor(Math.random() * pool.length);
            const skillClass = pool.splice(index, 1)[0];
            const SkillConstructor = skillClass.constructor as new (player: Player) => Skill;
            selected.push(new SkillConstructor(player));
        }

        while (selected.length < count && this.skillPool.length > 0) {
            const skillClass = this.skillPool[Math.floor(Math.random() * this.skillPool.length)];
            const SkillConstructor = skillClass.constructor as new (player: Player) => Skill;
            selected.push(new SkillConstructor(player));
        }

        return selected;
    }
}