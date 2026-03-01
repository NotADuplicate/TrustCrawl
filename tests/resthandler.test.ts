import { describe, expect, it, vi } from 'vitest';
import { Game } from '../server/game';
import { RestHandler } from '../server/resthandler';
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

describe('RestHandler', () => {
  it('still broadcasts rest even if preview preparation fails', () => {
    const game = new Game(0);
    const socket = createSocket();
    const player = game.addPlayer(socket as never, 'Charlie');
    player.health = 1;
    game.gamePlayers = game.players;
    game.currentEvent = { title: 'Carcass' } as never;

    const handler = new RestHandler(
      game,
      undefined,
      () => {
        throw new Error('preview failure');
      },
    );

    expect(() => handler.startRest()).not.toThrow();
    expect(handler.restActive).toBe(true);
    expect(game.currentEvent).toBeNull();
    expect(socket.send).toHaveBeenCalled();

    const payloads = socket.send.mock.calls.map(([payload]) => String(payload));
    expect(payloads.some((payload) => payload.includes('"type":"rest"'))).toBe(true);
    expect(payloads.some((payload) => payload.includes('"type":"game"'))).toBe(true);
  });

  it('auto-resolves rest when the rest timer expires', () => {
    vi.useFakeTimers();

    const game = new Game(0);
    const socket = createSocket();
    const player = game.addPlayer(socket as never, 'Charlie');
    game.gamePlayers = game.players;
    player.addItem(new Food());
    for (let index = 0; index < 7; index += 1) {
      player.addItem(new Tool());
    }

    const onAllContinued = vi.fn();
    const handler = new RestHandler(game, onAllContinued);

    handler.startRest();
    vi.advanceTimersByTime(game.getRestTimerMs());

    expect(onAllContinued).toHaveBeenCalledOnce();
    expect(onAllContinued.mock.calls[0]?.[0] === 'left' || onAllContinued.mock.calls[0]?.[0] === 'right').toBe(true);
    expect(player.inventory.filter((item) => item.name === 'Food')).toHaveLength(0);
    expect(player.inventory.reduce((sum, item) => sum + item.weight, 0)).toBeLessThanOrEqual(6);

    vi.useRealTimers();
  });

  it('sends missed rest continues through Too Slow without changing level again', () => {
    vi.useFakeTimers();

    const game = new Game(0);
    const firstSocket = createSocket();
    const secondSocket = createSocket();
    const firstPlayer = game.addPlayer(firstSocket as never, 'Charlie');
    const secondPlayer = game.addPlayer(secondSocket as never, 'Dana');
    game.gamePlayers = game.players;

    const onAllContinued = vi.fn();
    const handler = new RestHandler(game, onAllContinued);

    handler.startRest();
    const levelAfterRestStarted = game.level;
    handler.handleContinueVote(firstPlayer, 'left');
    vi.advanceTimersByTime(game.getRestTimerMs());

    expect(game.level).toBe(levelAfterRestStarted);
    expect(onAllContinued).toHaveBeenCalledOnce();
    expect(onAllContinued.mock.calls[0]?.[2]).toEqual([secondPlayer]);

    vi.useRealTimers();
  });
});
