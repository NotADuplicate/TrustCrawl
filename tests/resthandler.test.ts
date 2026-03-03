import { describe, expect, it, vi } from 'vitest';
import { Game } from '../server/game';
import { RestHandler } from '../server/resthandler';
import { Food } from '../server/models/Items/Supplies/food';
import { Tool } from '../server/models/Items/Supplies/tool';
import { Disturb, Poison } from '../server/models/Skills/DemonSkills';

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

  it('marks demon skills in the rest payload', () => {
    const game = new Game(0);
    const socket = createSocket();
    const player = game.addPlayer(socket as never, 'Charlie');
    player.isDemon = true;
    player.health = 1;
    game.gamePlayers = game.players;

    const handler = new RestHandler(game);
    const internals = handler as unknown as {
      playerSkills: Map<string, Array<{ name: string }>>;
    };

    internals.playerSkills.set(player.name, [
      { name: 'Scavenge' },
      { name: 'Scout' },
      new Disturb(),
    ]);

    handler.sendRestTo(socket as never);

    const payload = JSON.parse(String(socket.send.mock.calls.at(-1)?.[0] ?? '{}'));
    expect(payload.type).toBe('rest');
    expect(payload.skills).toHaveLength(3);
    expect(payload.skills[0]?.demon).toBe(false);
    expect(payload.skills[1]?.demon).toBe(false);
    expect(payload.skills[2]?.demon).toBe(true);
    expect([new Disturb().name, new Poison().name]).toContain(payload.skills[2]?.name);
  });

  it('waits for all living players to camp before marking camp ready', () => {
    const game = new Game(0);
    const firstSocket = createSocket();
    const secondSocket = createSocket();
    const firstPlayer = game.addPlayer(firstSocket as never, 'Charlie');
    const secondPlayer = game.addPlayer(secondSocket as never, 'Dana');
    firstPlayer.health = 1;
    secondPlayer.health = 1;
    game.gamePlayers = game.players;

    const handler = new RestHandler(game);
    handler.startRest();

    firstSocket.send.mockClear();
    secondSocket.send.mockClear();

    handler.handleCamp(firstPlayer);
    let firstPayload = JSON.parse(String(firstSocket.send.mock.calls.at(-1)?.[0] ?? '{}'));
    let secondPayload = JSON.parse(String(secondSocket.send.mock.calls.at(-1)?.[0] ?? '{}'));
    expect(firstPayload.type).toBe('rest');
    expect(firstPayload.camped).toBe(true);
    expect(firstPayload.campReady).toBe(false);
    expect(secondPayload.camped).toBe(false);
    expect(secondPayload.campReady).toBe(false);

    handler.handleCamp(secondPlayer);
    firstPayload = JSON.parse(String(firstSocket.send.mock.calls.at(-1)?.[0] ?? '{}'));
    secondPayload = JSON.parse(String(secondSocket.send.mock.calls.at(-1)?.[0] ?? '{}'));
    expect(firstPayload.campReady).toBe(true);
    expect(secondPayload.campReady).toBe(true);
    expect(secondPayload.camped).toBe(true);
  });

  it('does not send camp readiness or accusation vote prompts to dead players', () => {
    const game = new Game(0);
    const aliveSocket = createSocket();
    const deadSocket = createSocket();
    const alivePlayer = game.addPlayer(aliveSocket as never, 'Charlie');
    const deadPlayer = game.addPlayer(deadSocket as never, 'Dana');
    alivePlayer.health = 1;
    deadPlayer.kill();
    game.gamePlayers = game.players;

    const handler = new RestHandler(game);
    handler.startRest();

    aliveSocket.send.mockClear();
    deadSocket.send.mockClear();

    handler.handleCamp(alivePlayer);
    const alivePayload = JSON.parse(String(aliveSocket.send.mock.calls.at(-1)?.[0] ?? '{}'));
    const deadPayload = JSON.parse(String(deadSocket.send.mock.calls.at(-1)?.[0] ?? '{}'));
    expect(alivePayload.campReady).toBe(true);
    expect(deadPayload.campReady).toBe(false);

    aliveSocket.send.mockClear();
    deadSocket.send.mockClear();
    handler.handleAccuse(alivePlayer, deadPlayer.name);
    expect(aliveSocket.send.mock.calls.some(([payload]) => String(payload).includes('"type":"accuse"'))).toBe(true);
    expect(deadSocket.send.mock.calls.some(([payload]) => String(payload).includes('"type":"accuse"'))).toBe(false);
  });

  it('broadcasts a kill message to all players when an accusation succeeds', () => {
    const game = new Game(0);
    const firstSocket = createSocket();
    const secondSocket = createSocket();
    const firstPlayer = game.addPlayer(firstSocket as never, 'Charlie');
    const secondPlayer = game.addPlayer(secondSocket as never, 'Dana');
    firstPlayer.health = 1;
    secondPlayer.health = 1;
    game.gamePlayers = game.players;

    const handler = new RestHandler(game);
    handler.startRest();

    firstSocket.send.mockClear();
    secondSocket.send.mockClear();

    handler.handleAccuse(firstPlayer, secondPlayer.name);
    handler.handleAccuseVote(firstPlayer, true);
    handler.handleAccuseVote(secondPlayer, true);

    const firstResult = JSON.parse(
      String(firstSocket.send.mock.calls.findLast(([payload]) => String(payload).includes('"type":"modal"'))?.[0] ?? '{}'),
    );
    const secondResult = JSON.parse(
      String(secondSocket.send.mock.calls.findLast(([payload]) => String(payload).includes('"type":"modal"'))?.[0] ?? '{}'),
    );
    expect(firstResult.title).toBe('Accusation Result');
    expect(firstResult.description).toBe('Dana was killed.');
    expect(secondResult.description).toBe('Dana was killed.');
  });
});
