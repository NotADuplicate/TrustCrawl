import { Injectable } from '@angular/core';
import { Service } from './service';
import { SocketService } from './socket.service';

export type InfoModalState = {
  active: boolean;
  title: string;
  description: string;
};

@Injectable({ providedIn: 'root' })
export class ModalService extends Service {
  readonly state: InfoModalState = {
    active: false,
    title: '',
    description: '',
  };

  constructor(private readonly socket: SocketService) {
    super();
    this.socket.subscribe((data) => {
      if (data.type !== 'modal') {
        return;
      }

      this.state.active = true;
      this.state.title = String(data['title'] ?? 'Notice');
      this.state.description = String(data['description'] ?? '');
      this.refresh();
    });
  }

  dismiss(): void {
    this.state.active = false;
    this.state.title = '';
    this.state.description = '';
    this.refresh();
  }
}
