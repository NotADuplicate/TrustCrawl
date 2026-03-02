import { describe, expect, it, vi } from 'vitest';
import { EventHandler } from '../server/eventhandler';
import { Game } from '../server/game';
import { Player } from '../server/models/player';
import { Merchant } from '../server/models/Events/merchant';
import { SuspiciousMerchant } from '../server/models/Events/suspiciousMerchant';
import { Tea } from '../server/models/Items/Equipment';
import { Food } from '../server/models/Items/Supplies/food';
import { Gold } from '../server/models/Items/Supplies/gold';
import { Treasure } from '../server/models/Items/Supplies/treasure';
import { Traps } from '../server/models/Events/traps';

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

function setupSinglePlayerEvent<T>(event: T, game: Game, playerName = 'Alice') {
  const socket = createSocket();
  const player = game.addPlayer(socket as never, playerName);
  game.gamePlayers = game.players;

  const handler = new EventHandler(game);
  const internals = handler as unknown as {
    currentEvent: T;
    eventActive: boolean;
    votes: Map<string, number>;
    revealedPlayers: Set<string>;
  };

  internals.currentEvent = event;
  internals.eventActive = true;

  return { socket, player, handler, internals };
}

describe('Merchant events', () => {
  it('marks a Merchant item as sold out for everyone after one player buys it', () => {
    const game = new Game(0);
    const event = new Merchant(game.players);
    event.game = game;
    event.sales = [{ item: new Tea(), quantity: 1, price: 1 }];
    event.options = [
      { description: 'Leave the merchant alone and continue on your way.' },
      { description: 'Buy 1 Tea(s) for 1 gold.', repeatable: true },
    ];

    const aliceSocket = createSocket();
    const bobSocket = createSocket();
    const alice = game.addPlayer(aliceSocket as never, 'Alice');
    const bob = game.addPlayer(bobSocket as never, 'Bob');
    game.gamePlayers = game.players;

    const handler = new EventHandler(game);
    const internals = handler as unknown as {
      currentEvent: Merchant;
      eventActive: boolean;
      votes: Map<string, number>;
      revealedPlayers: Set<string>;
    };

    internals.currentEvent = event;
    internals.eventActive = true;
    game.currentEvent = event;

    alice.addItem(new Gold());
    bob.addItem(new Gold());

    aliceSocket.send.mockClear();
    bobSocket.send.mockClear();

    expect(handler.handleVote(aliceSocket as never, alice, 1)).toBe(false);
    expect(internals.votes.size).toBe(0);
    expect(internals.revealedPlayers.size).toBe(0);
    expect(alice.inventory.filter((item) => item.name === 'Gold')).toHaveLength(0);
    expect(alice.inventory.filter((item) => item.name === 'Tea')).toHaveLength(1);
    expect(event.isOptionAvailable(1, bob)).toBe(false);
    expect(handler.handleVote(bobSocket as never, bob, 1)).toBe(false);
    expect(bob.inventory.filter((item) => item.name === 'Tea')).toHaveLength(0);

    const alicePayload = JSON.parse(aliceSocket.send.mock.calls.at(-1)?.[0] ?? '{}');
    const bobPayload = JSON.parse(bobSocket.send.mock.calls.at(-1)?.[0] ?? '{}');
    expect(alicePayload.result?.text).toBe('Alice bought 1 Tea(s).');
    expect(alicePayload.options?.[1]?.available).toBe(false);
    expect(bobPayload.result?.text).toBe('Alice bought 1 Tea(s).');
    expect(bobPayload.options?.[1]?.available).toBe(false);

    expect(handler.handleVote(aliceSocket as never, alice, 0)).toBe(false);
    expect(internals.revealedPlayers.has(alice.name)).toBe(true);
  });

  it('lets a player repeat safe Suspicious Merchant purchases until a non-repeatable option ends the event', () => {
    const game = new Game(0);
    const event = new SuspiciousMerchant(game.players);
    event.game = game;
    event.stealPrice = 2;
    event.sales = [
      { item: new Food(), quantity: 2, price: 1 },
      { item: new Tea(), quantity: 1, price: 3 },
    ];
    event.options = [
      { description: 'Leave the merchant alone and continue on your way.' },
      { description: 'Buy 2 Food(s) for 1 gold.', repeatable: true },
      { description: 'Buy 1 Tea(s) for 3 gold.', repeatable: false, demonText: 'The merchant will steal your gold!' },
    ];

    const { socket, player, handler, internals } = setupSinglePlayerEvent(event, game);
    player.addItem(new Gold());
    player.addItem(new Gold());
    player.addItem(new Gold());
    player.addItem(new Gold());
    const treasure = new Treasure(4);
    player.addItem(treasure);

    game.currentEvent = event;
    expect(treasure.isUsable(game, player)).toBe(true);

    expect(handler.handleVote(socket as never, player, 1)).toBe(false);
    expect(internals.votes.size).toBe(0);
    expect(internals.revealedPlayers.size).toBe(0);
    expect(player.inventory.filter((item) => item.name === 'Gold')).toHaveLength(3);
    expect(player.inventory.filter((item) => item.name === 'Food')).toHaveLength(2);

    expect(handler.handleVote(socket as never, player, 1)).toBe(false);
    expect(internals.votes.size).toBe(0);
    expect(internals.revealedPlayers.size).toBe(0);
    expect(player.inventory.filter((item) => item.name === 'Gold')).toHaveLength(3);
    expect(player.inventory.filter((item) => item.name === 'Food')).toHaveLength(2);

    expect(handler.handleVote(socket as never, player, 2)).toBe(true);
    expect(internals.revealedPlayers.has(player.name)).toBe(true);
    expect(player.inventory.filter((item) => item.name === 'Gold')).toHaveLength(0);
    expect(player.inventory.filter((item) => item.name === 'Tea')).toHaveLength(0);
    expect(player.inventory.filter((item) => item.name === 'Food')).toHaveLength(2);
  });

  it('only allows Treasure to be used during Merchant or Suspicious Merchant events', () => {
    const game = new Game(0);
    const player = new Player('Alice', game);
    game.players.push(player);
    const treasure = new Treasure(3);
    player.addItem(treasure);

    game.currentEvent = null;
    expect(treasure.isUsable(game, player)).toBe(false);

    const traps = new Traps(game.players);
    traps.game = game;
    game.currentEvent = traps;
    expect(treasure.isUsable(game, player)).toBe(false);

    const merchant = new Merchant(game.players);
    merchant.game = game;
    game.currentEvent = merchant;
    expect(treasure.isUsable(game, player)).toBe(true);

    const suspiciousMerchant = new SuspiciousMerchant(game.players);
    suspiciousMerchant.game = game;
    game.currentEvent = suspiciousMerchant;
    expect(treasure.isUsable(game, player)).toBe(true);
  });

  it('converts Treasure into Gold and removes it when used at a Merchant event', () => {
    const game = new Game(0);
    const player = new Player('Alice', game);
    game.players.push(player);

    const treasure = new Treasure(3);
    player.addItem(treasure);

    const merchant = new Merchant(game.players);
    merchant.game = game;
    game.currentEvent = merchant;

    expect(treasure.isUsable(game, player)).toBe(true);

    const result = treasure.use(game, player);

    expect(result).toBe('You sold the Treasure for 3 gold.');
    expect(player.inventory.filter((item) => item.name === 'Treasure')).toHaveLength(0);
    expect(player.inventory.filter((item) => item.name === 'Gold')).toHaveLength(3);
  });
});
