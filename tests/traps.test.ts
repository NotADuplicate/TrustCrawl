import { describe, expect, it } from 'vitest';
import { Game } from '../server/game';
import { Player } from '../server/models/player';
import { Traps } from '../server/models/Events/traps';

describe('Traps event', () => {
  it('returns success for a non-trapped option', () => {
    const game = new Game(0);
    const players = [new Player('Alice', game), new Player('Blake', game)];
    game.players.push(...players);

    const event = new Traps(players);
    event.game = game;

    const trapped = event.trappedOption;
    const safeOption = [0, 1, 2].find((option) => option !== trapped) ?? 0;

    const result = event.optionSelected(safeOption, players[0]);

    expect(result.color).toBe('success');
    expect(result.text.toLowerCase()).toContain('safe');
    expect(players.every((player) => player.health === 3)).toBe(true);
    expect(game.floorItems.length).toBeGreaterThan(0);
  });
});
