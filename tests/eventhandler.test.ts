import { describe, expect, it, vi } from 'vitest';
import { EventHandler } from '../server/eventhandler';
import { Game } from '../server/game';
import { Boss } from '../server/models/Events/boss';
import { TooSlow } from '../server/models/Events/tooSlow';
import { Rubble } from '../server/models/Events';
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
});
