import { describe, expect, it, vi } from 'vitest';
import { EventHandler } from '../server/eventhandler';
import { Game } from '../server/game';
import { Player } from '../server/models/player';
import { Traps } from '../server/models/Events/traps';
import { Food } from '../server/models/Items/Supplies/food';
import { Tool } from '../server/models/Items/Supplies/tool';

type MockSocket = {
  OPEN: number;
  readyState: number;
  send: ReturnType<typeof vi.fn>;
};

function createSocket(): MockSocket {
  return {
    OPEN: 1,
    readyState: 1,
    send: vi.fn(),
  };
}

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

  it('resolves group votes only after everyone votes and repeats until the group leaves', () => {
    const game = new Game(0);
    const firstSocket = createSocket();
    const secondSocket = createSocket();
    const firstPlayer = game.addPlayer(firstSocket as never, 'Alice');
    const secondPlayer = game.addPlayer(secondSocket as never, 'Blake');
    game.gamePlayers = game.players;

    const event = new Traps(game.players);
    event.game = game;
    event.trappedOption = 2;
    event.bags = [[new Food()], [new Tool()], []];
    event.options = [
      { description: 'Bag 1', repeatable: true },
      { description: 'Bag 2', repeatable: true },
      { description: 'Bag 3', repeatable: false },
      { description: 'Leave' },
    ];

    const handler = new EventHandler(game);
    const internals = handler as unknown as {
      currentEvent: Traps;
      eventActive: boolean;
      votes: Map<string, number>;
    };
    internals.currentEvent = event;
    internals.eventActive = true;

    expect(handler.handleVote(firstSocket as never, firstPlayer, 0)).toBe(false);
    expect(internals.votes.size).toBe(1);
    expect(game.floorItems).toHaveLength(0);

    expect(handler.handleVote(secondSocket as never, secondPlayer, 0)).toBe(false);
    expect(internals.votes.size).toBe(0);
    expect(game.floorItems.map((item) => item.name)).toEqual(['Food']);

    expect(handler.handleVote(firstSocket as never, firstPlayer, 1)).toBe(false);
    expect(internals.votes.size).toBe(1);
    expect(game.floorItems.map((item) => item.name)).toEqual(['Food']);

    expect(handler.handleVote(secondSocket as never, secondPlayer, 1)).toBe(false);
    expect(internals.votes.size).toBe(0);
    expect(game.floorItems.map((item) => item.name)).toEqual(['Food', 'Tool']);

    expect(handler.handleVote(firstSocket as never, firstPlayer, 3)).toBe(false);
    expect(handler.handleVote(secondSocket as never, secondPlayer, 3)).toBe(true);
    expect(game.floorItems.map((item) => item.name)).toEqual(['Food', 'Tool']);
    expect(game.players.every((player) => player.health === 3)).toBe(true);
  });

  it('ends immediately when the group picks the trapped bag', () => {
    const game = new Game(0);
    const firstSocket = createSocket();
    const secondSocket = createSocket();
    const firstPlayer = game.addPlayer(firstSocket as never, 'Alice');
    const secondPlayer = game.addPlayer(secondSocket as never, 'Blake');
    game.gamePlayers = game.players;

    const event = new Traps(game.players);
    event.game = game;
    event.trappedOption = 1;
    event.bags = [[new Food()], [], [new Tool()]];
    event.options = [
      { description: 'Bag 1', repeatable: true },
      { description: 'Bag 2', repeatable: false },
      { description: 'Bag 3', repeatable: true },
      { description: 'Leave' },
    ];

    const handler = new EventHandler(game);
    const internals = handler as unknown as {
      currentEvent: Traps;
      eventActive: boolean;
      votes: Map<string, number>;
    };
    internals.currentEvent = event;
    internals.eventActive = true;

    expect(handler.handleVote(firstSocket as never, firstPlayer, 1)).toBe(false);
    expect(handler.handleVote(secondSocket as never, secondPlayer, 1)).toBe(true);
    expect(internals.votes.size).toBe(2);
    expect(game.players.map((player) => player.health)).toEqual([2, 2]);
  });
});
