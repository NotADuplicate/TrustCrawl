import { describe, expect, it, vi } from 'vitest';
import { EventHandler } from '../server/eventhandler';
import { Game } from '../server/game';
import { RestHandler } from '../server/resthandler';
import { Food } from '../server/models/Items/Supplies/food';
import { Tool } from '../server/models/Items/Supplies/tool';
import { Player } from '../server/models/player';
import { Rubble } from '../server/models/Events';

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

describe('player state rules', () => {
  it('limits unconscious players to carrying at most two food', () => {
    const game = new Game(0);
    const player = new Player('Alice', game);
    game.players.push(player);

    player.damage(3);

    expect(player.health).toBe(0);
    expect(player.inventory).toHaveLength(0);
    expect(game.floorItems.some((item) => item.name === "Alice's Body")).toBe(true);

    player.addItem(new Food());
    player.addItem(new Food());
    player.addItem(new Tool());
    player.addItem(new Food());

    expect(player.inventory.map((item) => item.name)).toEqual(['Food', 'Food']);
    expect(game.floorItems.filter((item) => item.name === 'Tool')).toHaveLength(1);
    expect(game.floorItems.filter((item) => item.name === 'Food')).toHaveLength(1);
  });

  it('kills unconscious players who are not being carried when the group continues', () => {
    const game = new Game(0);
    const carrierSocket = createSocket();
    const carrier = game.addPlayer(carrierSocket as never, 'Carrier');
    const fallen = game.addPlayer(createSocket() as never, 'Fallen');
    game.gamePlayers = game.players;
    fallen.damage(3);

    const onAllContinued = vi.fn();
    const handler = new RestHandler(game, onAllContinued);
    handler.restActive = true;

    handler.handleContinueVote(carrier, 'left');

    expect(fallen.health).toBe(-1);
    expect(fallen.dead).toBe(true);
    expect(game.floorItems.some((item) => item.name === "Fallen's Body")).toBe(false);
    expect(onAllContinued).toHaveBeenCalledWith('left', 'Carrier', undefined);
  });

  it('prevents dead players from influencing events or inventory actions', () => {
    const game = new Game(0);
    const socket = createSocket();
    const player = game.addPlayer(socket as never, 'Watcher');
    game.gamePlayers = game.players;
    player.kill();

    game.floorItems.push(new Food());
    expect(game.moveToInventory(player, 'Food')).toBe(false);

    const handler = new EventHandler(game);
    const event = new Rubble(game.players);
    event.game = game;
    const internals = handler as unknown as {
      currentEvent: Rubble;
      eventActive: boolean;
    };
    internals.currentEvent = event;
    internals.eventActive = true;

    expect(handler.handleVote(socket as never, player, 0)).toBe(false);
  });

  it('shows poisoned food name only to demon recipients in game payloads', () => {
    const game = new Game(0);
    const demon = new Player('Demon', game);
    const human = new Player('Human', game);
    game.players.push(demon, human);
    game.gamePlayers = game.players;
    game.demonName = demon.name;

    const poisonedFood = new Food();
    poisonedFood.poisoned = true;
    human.addItem(poisonedFood);

    const demonPayload = JSON.parse(game.buildGamePayload(demon.name) ?? '{}');
    const humanPayload = JSON.parse(game.buildGamePayload(human.name) ?? '{}');

    const demonSeenName = demonPayload.players
      .find((entry: { name: string }) => entry.name === human.name)
      ?.inventory?.[0]?.name;
    const humanSeenName = humanPayload.players
      .find((entry: { name: string }) => entry.name === human.name)
      ?.inventory?.[0]?.name;

    expect(demonSeenName).toBe('Poisoned food');
    expect(humanSeenName).toBe('Food');
  });

  it('allows demons to drop and pick up poisoned food using the displayed item name', () => {
    const game = new Game(0);
    const demon = new Player('Demon', game);
    game.players.push(demon);
    game.gamePlayers = game.players;
    game.demonName = demon.name;
    demon.isDemon = true;

    const poisonedFood = new Food();
    poisonedFood.poisoned = true;
    demon.addItem(poisonedFood);

    expect(game.moveToFloor(demon, 'Poisoned food')).toBe(true);
    expect(demon.inventory).toHaveLength(0);
    expect(game.floorItems[0]).toBe(poisonedFood);

    expect(game.moveToInventory(demon, 'Poisoned food')).toBe(true);
    expect(game.floorItems).toHaveLength(0);
    expect(demon.inventory).toHaveLength(1);
    expect((demon.inventory[0] as Food).poisoned).toBe(true);
  });
});
