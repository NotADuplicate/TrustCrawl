import { describe, expect, it } from 'vitest';
import { Game } from '../server/game';

describe('Game timer settings', () => {
  it('uses the configured normal difficulty timer formula', () => {
    const game = new Game(0);
    game.startGame('normal');

    expect(game.getEventTimerSeconds()).toBe(35);
    expect(game.getEventContinueTimerMs()).toBe(Math.ceil(35_000 / 3));
    expect(game.getRestTimerMs()).toBe(Math.ceil(35_000 * 1.3));
  });

  it('changes event timer length based on difficulty and player count', () => {
    const game = new Game(0);
    game.addPlayer({ OPEN: 1, readyState: 1, send() {} } as never, 'Alice');
    game.addPlayer({ OPEN: 1, readyState: 1, send() {} } as never, 'Blake');

    game.startGame('beginner');
    expect(game.getEventTimerSeconds()).toBe(52);

    game.difficulty = 'expert';
    expect(game.getEventTimerSeconds()).toBe(32);
  });
});
