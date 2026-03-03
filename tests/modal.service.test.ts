import { describe, expect, it } from 'vitest';
import { ModalService } from '../client/src/app/services/modal.service';
import { SocketService } from '../client/src/app/services/socket.service';

type MessageHandler = (data: { [key: string]: unknown }) => void;

function createMockSocket() {
  let handler: MessageHandler | undefined;

  const socket = {
    status: 'connected',
    subscribe(callback: MessageHandler) {
      handler = callback;
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

describe('ModalService', () => {
  it('shows and dismisses shared information modals', () => {
    const mock = createMockSocket();
    const service = new ModalService(mock.socket);

    mock.emit({
      type: 'modal',
      title: 'Accusation Result',
      description: 'Dana was killed.',
    });

    expect(service.state.active).toBe(true);
    expect(service.state.title).toBe('Accusation Result');
    expect(service.state.description).toBe('Dana was killed.');

    service.dismiss();
    expect(service.state.active).toBe(false);
    expect(service.state.title).toBe('');
    expect(service.state.description).toBe('');
  });
});
