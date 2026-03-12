import { describe, expect, it, vi } from 'vitest';
import { EventHandler } from '../server/eventhandler';
import { Game } from '../server/game';
import { Boss } from '../server/models/Events/boss';
import { TooSlow } from '../server/models/Events/tooSlow';
import { Rubble } from '../server/models/Events';
import { Event } from '../server/models/event';
import { beforeEach, afterEach } from 'vitest';

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

describe('EventHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates the boss lazily using the current player count', () => {
    const game = new Game(0);
    game.addPlayer(createSocket() as never, 'Alice');
    game.addPlayer(createSocket() as never, 'Blake');
    game.gamePlayers = game.players;
    game.level = 12;

    const handler = new EventHandler(game);
    handler.resetForNewGame();

    const event = handler.pickEvent();

    expect(event).toBeInstanceOf(Boss);
    expect((event as Boss).health).toBeGreaterThanOrEqual(game.players.length);
    expect((event as Boss).health).toBeLessThanOrEqual(game.players.length * 2);
  });

  it('broadcasts game-won instead of starting another rest after a boss kill', () => {
    const game = new Game(0);
    const socket = createSocket();
    const player = game.addPlayer(socket as never, 'Charlie');
    game.gamePlayers = game.players;

    const onEventFinished = vi.fn();
    const handler = new EventHandler(game, onEventFinished);
    const boss = new Boss(game.players);
    boss.health = 0;

    const internals = handler as unknown as {
      currentEvent: Boss;
      eventFinished: boolean;
      endContinues: Set<string>;
    };
    internals.currentEvent = boss;
    internals.eventFinished = true;

    handler.handleEventEndContinue(player);

    expect(onEventFinished).not.toHaveBeenCalled();
    expect(game.currentEvent).toBeNull();
    expect(socket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'game-won',
        message: 'You defeated the boss monster and escaped the crawl!',
      }),
    );
  });

  it('rebroadcasts game state when a new event starts so item usability updates', () => {
    const game = new Game(0);
    const socket = createSocket();
    game.addPlayer(socket as never, 'Charlie');
    game.gamePlayers = game.players;

    const handler = new EventHandler(game);
    const previewEvent = new Rubble(game.players);
    previewEvent.game = game;

    const internals = handler as unknown as {
      previewLeft: Rubble;
      previewRight: Rubble;
    };
    internals.previewLeft = previewEvent;
    internals.previewRight = previewEvent;

    handler.startEvent('left');

    const payloads = socket.send.mock.calls.map(([payload]) => String(payload));
    expect(payloads.some((payload) => payload.includes('"type":"game"'))).toBe(true);
    expect(payloads.some((payload) => payload.includes('"type":"event"'))).toBe(true);
  });

  it('automatically finishes Too Slow after its continue timer expires', () => {
    const game = new Game(0);
    const player = game.addPlayer(createSocket() as never, 'Charlie');
    game.gamePlayers = game.players;

    const onEventFinished = vi.fn();
    const handler = new EventHandler(game, onEventFinished);
    handler.startTooSlowEvent([player], onEventFinished);

    const internals = handler as unknown as {
      revealEvent: (result: { text: string; color: 'info' }) => void;
    };
    internals.revealEvent({ text: 'Resolved', color: 'info' });
    vi.advanceTimersByTime(game.getEventContinueTimerMs());

    expect(onEventFinished).toHaveBeenCalledOnce();
  });

  it('routes a missed event continue timer into Too Slow before the next phase', () => {
    const game = new Game(0);
    game.addPlayer(createSocket() as never, 'Charlie');
    game.gamePlayers = game.players;

    const onEventFinished = vi.fn();
    const handler = new EventHandler(game, onEventFinished);
    const internals = handler as unknown as {
      currentEvent: Rubble;
      revealEvent: (result: { text: string; color: 'info' }) => void;
      currentEventAccess: unknown;
    };
    internals.currentEvent = new Rubble(game.players);

    internals.revealEvent({ text: 'Resolved', color: 'info' });
    vi.advanceTimersByTime(game.getEventContinueTimerMs());

    const activeEvent = (handler as unknown as { currentEvent: unknown }).currentEvent;
    expect(activeEvent).toBeInstanceOf(TooSlow);
    expect(onEventFinished).not.toHaveBeenCalled();
  });

  it('continues to the stored destination after Too Slow ends', () => {
    const game = new Game(0);
    const socket = createSocket();
    const player = game.addPlayer(socket as never, 'Charlie');
    game.gamePlayers = game.players;

    const onEventFinished = vi.fn();
    const handler = new EventHandler(game, onEventFinished);
    handler.startTooSlowEvent([player], onEventFinished);

    const internals = handler as unknown as {
      revealEvent: (result: { text: string; color: 'info' }) => void;
    };

    internals.revealEvent({ text: 'Resolved', color: 'info' });
    handler.handleEventEndContinue(player);

    expect(onEventFinished).toHaveBeenCalledOnce();
  });

  it('resolves group votes by majority and only uses randomness to break ties', () => {
    const game = new Game(0);
    const first = game.addPlayer(createSocket() as never, 'Alice');
    const second = game.addPlayer(createSocket() as never, 'Blake');
    const third = game.addPlayer(createSocket() as never, 'Casey');
    game.gamePlayers = game.players;

    class TestGroupEvent extends Event {
      constructor() {
        super(
          'Vote Test',
          'Vote on an option.',
          [
            { description: 'Option 1' },
            { description: 'Option 2' },
          ],
          'group',
          game.players,
        );
      }

      override optionSelected(optionNumber: number) {
        return { text: `Resolved ${optionNumber}`, color: 'info' as const };
      }
    }

    const handler = new EventHandler(game);
    const internals = handler as unknown as {
      currentEvent: Event;
      votes: Map<string, number>;
    };
    internals.currentEvent = new TestGroupEvent();
    internals.votes.set(first.name, 1);
    internals.votes.set(second.name, 1);
    internals.votes.set(third.name, 0);

    const majorityResult = handler.groupEventResolve();
    expect(majorityResult.selectedOption).toBe(1);
    expect([first.name, second.name]).toContain(majorityResult.selectedPlayer);
    expect(majorityResult.result.text).toBe('Resolved 1');

    internals.votes.clear();
    internals.votes.set(first.name, 0);
    internals.votes.set(second.name, 1);

    vi.spyOn(Math, 'random').mockReturnValueOnce(0.9);
    const tieResult = handler.groupEventResolve();
    expect(tieResult.selectedOption).toBe(1);
    expect(tieResult.selectedPlayer).toBe(second.name);
    expect(tieResult.result.text).toBe('Resolved 1');
  });

  it('does not include selectedPlayer in group reveal payloads', () => {
    const game = new Game(0);
    const firstSocket = createSocket();
    const secondSocket = createSocket();
    const first = game.addPlayer(firstSocket as never, 'Alice');
    const second = game.addPlayer(secondSocket as never, 'Blake');
    game.gamePlayers = game.players;

    class GroupPayloadEvent extends Event {
      constructor() {
        super(
          'Group Payload',
          'Payload test.',
          [{ description: 'A' }, { description: 'B' }],
          'group',
          game.players,
        );
      }
      override optionSelected(optionNumber: number) {
        return { text: `Option ${optionNumber}`, color: 'info' as const };
      }
    }

    const handler = new EventHandler(game);
    const internals = handler as unknown as {
      currentEvent: Event;
      eventActive: boolean;
    };
    internals.currentEvent = new GroupPayloadEvent();
    internals.eventActive = true;

    handler.handleVote(firstSocket as never, first, 0);
    handler.handleVote(secondSocket as never, second, 0);

    const payload = JSON.parse(
      String(firstSocket.send.mock.calls.findLast(([entry]) => String(entry).includes('"type":"event"') && String(entry).includes('"status":"revealed"'))?.[0] ?? '{}'),
    );
    expect(payload.type).toBe('event');
    expect(payload.status).toBe('revealed');
    expect(payload.selectedPlayer).toBeUndefined();
  });

  it('updates selected option when a confused player is forced to a different option', () => {
    const game = new Game(0);
    const confusedSocket = createSocket();
    const otherSocket = createSocket();
    const confusedPlayer = game.addPlayer(confusedSocket as never, 'Confused');
    const otherPlayer = game.addPlayer(otherSocket as never, 'Other');
    confusedPlayer.confused = true;
    game.gamePlayers = game.players;

    class ConfusionEvent extends Event {
      constructor() {
        super(
          'Confusion Test',
          'Confusion test.',
          [
            { description: 'Option 1', selectedText: 'Picked 1' },
            { description: 'Option 2', selectedText: 'Picked 2' },
          ],
          'individual',
          game.players,
        );
      }
      override optionSelected(optionNumber: number) {
        return { text: `Resolved ${optionNumber}`, color: 'info' as const };
      }
      override eventEnded() {
        return { text: 'Ended', color: 'info' as const };
      }
    }

    const handler = new EventHandler(game);
    const internals = handler as unknown as {
      currentEvent: Event;
      eventActive: boolean;
    };
    internals.currentEvent = new ConfusionEvent();
    internals.eventActive = true;

    handler.handleVote(confusedSocket as never, confusedPlayer, 0);
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.9);
    handler.handleVote(otherSocket as never, otherPlayer, 0);

    const confusedReveal = JSON.parse(
      String(confusedSocket.send.mock.calls.findLast(([entry]) => String(entry).includes('"type":"event"') && String(entry).includes('"status":"revealed"'))?.[0] ?? '{}'),
    );
    expect(confusedReveal.type).toBe('event');
    expect(confusedReveal.status).toBe('revealed');
    expect(confusedReveal.selectedOption).toBe(1);
  });
});
