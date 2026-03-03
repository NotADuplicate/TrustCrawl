import { describe, expect, it, vi } from 'vitest';
import { RestingService } from '../client/src/app/services/resting.service';
import { SocketService } from '../client/src/app/services/socket.service';

type MessageHandler = (data: { [key: string]: unknown }) => void;

function createMockSocket() {
  let handler: MessageHandler | undefined;
  const send = vi.fn();

  const socket = {
    status: 'connected',
    subscribe(callback: MessageHandler) {
      handler = callback;
    },
    send,
  };

  return {
    socket: socket as unknown as SocketService,
    send,
    emit(data: { [key: string]: unknown }) {
      if (!handler) {
        throw new Error('Socket subscriber was not registered.');
      }

      handler(data);
    },
  };
}

describe('RestingService', () => {
  it('tracks camp readiness and only allows eating after camp is ready', () => {
    const mock = createMockSocket();
    const service = new RestingService(mock.socket);

    mock.emit({
      type: 'rest',
      title: 'Resting',
      skills: [],
      selectedSkills: [],
      camped: false,
      campReady: false,
      haveEaten: false,
      secondsLeft: 10,
      totalSeconds: 20,
    });

    service.camp();
    expect(mock.send).toHaveBeenCalledWith({ type: 'rest:camp' });
    expect(service.state.camped).toBe(true);

    mock.send.mockClear();
    service.eatFood(1);
    expect(mock.send).not.toHaveBeenCalled();

    mock.emit({
      type: 'rest',
      title: 'Resting',
      skills: [],
      selectedSkills: [],
      camped: true,
      campReady: true,
      haveEaten: false,
      secondsLeft: 9,
      totalSeconds: 20,
    });

    service.eatFood(2);
    expect(mock.send).toHaveBeenCalledWith({ type: 'rest:eat', eatAmount: 2 });
    expect(service.state.haveEaten).toBe(true);
  });

  it('clears the accusation prompt when a server info modal arrives', () => {
    const mock = createMockSocket();
    const service = new RestingService(mock.socket);

    mock.emit({
      type: 'accuse',
      accuser: 'Alice',
      accused: 'Bob',
    });

    expect(service.state.accuseActive).toBe(true);

    mock.emit({
      type: 'modal',
      title: 'Accusation Result',
      description: 'Bob was killed.',
    });

    expect(service.state.accuseActive).toBe(false);
  });
});
