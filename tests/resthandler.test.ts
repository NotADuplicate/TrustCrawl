import { describe, expect, it, vi } from 'vitest';
import { Game } from '../server/game';
import { RestHandler } from '../server/resthandler';

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
});
