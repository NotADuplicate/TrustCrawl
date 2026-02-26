import {Skill} from '../../server/models/skill';
import { describe, expect, it } from 'vitest';
import { describe, expect, it } from 'vitest';
import { Game } from '../server/game';
import { RestHandler } from '../server/resthandler';

describe('RestHandler pickSkills distribution', () => {
	it('finds the least frequent skill across 100 rolls', () => {
		const game = new Game(0);
		const restHandler = new RestHandler(game);
		const counts = new Map<string, number>();

		for (let i = 0; i < 100; i += 1) {
			const picks = restHandler.pickSkills(2);
			for (const skill of picks) {
				const key = skill.name;
				counts.set(key, (counts.get(key) ?? 0) + 1);
			}
		}

		const entries = Array.from(counts.entries());
		const leastCount = Math.min(...entries.map(([, count]) => count));
		const leastSkills = entries.filter(([, count]) => count === leastCount).map(([name]) => name);

		expect(entries.length).toBeGreaterThan(0);
		expect(leastSkills.length).toBeGreaterThan(0);
	});
});
import { RestHandler } from '../server/resthandler';

describe('RestHandler pickSkills distribution', () => {
	it('finds the least frequent skill across 100 rolls', () => {
		const game = new Game(0);
		const restHandler = new RestHandler(game);
		const counts = new Map<string, number>();

		for (let i = 0; i < 100; i += 1) {
			const picks = restHandler.pickSkills(2);
			for (const skill of picks) {
				const key = skill.name;
				counts.set(key, (counts.get(key) ?? 0) + 1);
			}
		}

		const entries = Array.from(counts.entries());
		const leastCount = Math.min(...entries.map(([, count]) => count));
		const leastSkills = entries.filter(([, count]) => count === leastCount).map(([name]) => name);
        console.log('Skill distribution:', entries);

		expect(entries.length).toBeGreaterThan(0);
		expect(leastSkills.length).toBeGreaterThan(0);
	});
});