import { describe, expect, it } from 'vitest';
import { EventService } from '../client/src/app/services/event.service';
import { SocketService } from '../client/src/app/services/socket.service';

type MessageHandler = (data: { [key: string]: unknown }) => void;

function createMockSocket() {
  let handler: MessageHandler | undefined;

  const socket = {
    status: 'connected',
    subscribe(callback: MessageHandler) {
      handler = callback;
    },
    send() {
      // No-op for tests.
    },
  };

  return {
    socket: socket as unknown as SocketService,
    emit(data: { [key: string]: unknown }) {
      if (!handler) {
        throw new Error('Socket subscriber was not registered.');
      }

      handler(data);
    },
  };
}

describe('EventService', () => {
  it('preserves the individual result message after event-ended arrives', () => {
    const mock = createMockSocket();
    const service = new EventService(mock.socket);

    mock.emit({
      type: 'event',
      title: 'Merchant',
      description: 'A merchant offers a deal.',
      options: [{ description: 'Leave' }],
      mode: 'individual',
      status: 'revealed',
      secondsLeft: 0,
      selectedOption: 0,
      selectedPlayer: 'Alice',
      result: {
        text: 'You buy 1 Tea(s) for 1 gold.',
        color: 'success',
      },
    });

    expect(service.state.resultMessage).toBe('You buy 1 Tea(s) for 1 gold.');
    expect(service.state.endedMessage).toBeNull();

    mock.emit({
      type: 'event',
      title: 'Merchant',
      description: 'A merchant offers a deal.',
      options: [{ description: 'Leave' }],
      mode: 'individual',
      status: 'revealed',
      secondsLeft: 0,
      selectedOption: 0,
      selectedPlayer: 'Alice',
    });

    expect(service.state.resultMessage).toBe('You buy 1 Tea(s) for 1 gold.');

    mock.emit({
      type: 'event-ended',
      message: 'The merchant disappears into the shadows...',
      color: 'info',
    });

    expect(service.state.resultMessage).toBe('You buy 1 Tea(s) for 1 gold.');
    expect(service.state.resultColor).toBe('success');
    expect(service.state.endedMessage).toBe('The merchant disappears into the shadows...');
    expect(service.state.endedColor).toBe('info');
  });
});
