import { Injectable } from '@angular/core';
import { SocketService } from './socket.service';
import { Service } from './service';

export type EventOption = {
  description: string;
  available?: boolean;
  demonText?: string;
  quantity?: boolean;
  max?: number;
  repeatable?: boolean;
};

export type EventMode = 'group' | 'individual';

export type EventState = {
  title: string;
  description: string;
  options: EventOption[];
  status: 'voting' | 'revealed' | 'preview';
  mode: EventMode;
  totalSeconds: number;
  secondsLeft: number;
  results: Array<{ optionIndex: number; votes: number }>;
  selectedOption: number | null;
  selectedPlayer: string | null;
  votedOption: number | null;
  sequence: number;
  active: boolean;
  endedMessage: string | null;
  endedColor: 'success' | 'danger' | 'warning' | 'info' | null;
  endedDemonText: string | null;
  endedContinue: boolean;
  resultMessage: string | null;
  resultColor: 'success' | 'danger' | 'warning' | 'info' | null;
  resultDemonText: string | null;
  preview: boolean;
  won: boolean;
  winMessage: string | null;
};

@Injectable({ providedIn: 'root' })
export class EventService extends Service {
  readonly state: EventState = {
    title: '',
    description: '',
    options: [],
    status: 'voting',
    mode: 'group',
    totalSeconds: 45,
    secondsLeft: 0,
    results: [],
    selectedOption: null,
    selectedPlayer: null,
    votedOption: null,
    sequence: 0,
    active: false,
    endedMessage: null,
    endedColor: null,
    endedDemonText: null,
    endedContinue: false,
    resultMessage: null,
    resultColor: null,
    resultDemonText: null,
    preview: false,
    won: false,
    winMessage: null,
  };

  private countdownTimer?: ReturnType<typeof setInterval>;
  private lastStatus: 'voting' | 'revealed' = 'voting';
  private readonly listeners: Array<() => void> = [];
  private readonly winListeners: Array<() => void> = [];

  constructor(private readonly socket: SocketService) {
    super();
    this.socket.subscribe((data) => {
      if (data.type === 'game-won') {
        this.state.won = true;
        this.state.winMessage = String(
          data['message'] ?? 'You defeated the boss monster and escaped the crawl!',
        );
        this.stopCountdown();
        this.refresh();
        for (const listener of this.winListeners) {
          listener();
        }
        return;
      }

      if (data.type === 'event-ended') {
        this.state.endedMessage = String(data['message'] ?? 'Event ended.');
        this.state.endedColor = (data['color'] as 'success' | 'danger' | 'warning' | 'info') ?? 'info';
        this.state.endedDemonText = (data['demonText'] as string | null) ?? null;
        this.state.endedContinue = false;
        this.refresh();
        return;
      }

      if (data.type === 'event-preview') {
        this.applyBaseState(data, true);
        this.state.active = false;
        this.state.status = 'preview';
        this.state.secondsLeft = 0;
        this.clearEndedState();
        this.clearResultState();
        this.refresh();
        return;
      }

      if (data.type !== 'event') {
        return;
      }

      const nextStatus = (data['status'] as 'voting' | 'revealed') ?? 'voting';
      const isNewEvent = !this.state.active || (nextStatus === 'voting' && this.lastStatus === 'revealed');
      if (isNewEvent) {
        this.state.sequence += 1;
      }
      this.state.active = true;
      this.applyBaseState(data, false);
      this.state.status = nextStatus;
      this.lastStatus = nextStatus;
      this.state.totalSeconds = typeof data['totalSeconds'] === 'number' ? data['totalSeconds'] : this.state.totalSeconds;
      this.state.results = Array.isArray(data['results'])
        ? (data['results'] as Array<{ optionIndex: number; votes: number }>)
        : [];
      this.state.selectedOption = (data['selectedOption'] as number | null) ?? null;
      this.state.selectedPlayer = (data['selectedPlayer'] as string | null) ?? null;
      const result = data['result'] as
        | { text?: string; color?: 'success' | 'danger' | 'warning' | 'info'; demonText?: string }
        | undefined;
      if (result) {
        this.state.resultMessage = result.text ?? null;
        this.state.resultColor = result.color ?? null;
        this.state.resultDemonText = result.demonText ?? null;
      } else if (isNewEvent || this.state.mode !== 'individual') {
        this.clearResultState();
      }

      if (this.state.status === 'voting') {
        this.state.votedOption = null;
        this.clearEndedState();
        this.state.preview = false;
      }

      const secondsLeft = typeof data['secondsLeft'] === 'number' ? data['secondsLeft'] : 0;
      this.startCountdown(secondsLeft, this.state.status);

      if (isNewEvent) {
        for (const listener of this.listeners) {
          listener();
        }
      }
    });
  }

  onNewEvent(listener: () => void): void {
    this.listeners.push(listener);
  }

  onGameWon(listener: () => void): void {
    this.winListeners.push(listener);
  }

  requestEvent(): void {
    if (this.socket.status !== 'connected') {
      return;
    }

    this.socket.send({ type: 'event:request' });
  }

  requestPreview(direction: 'left' | 'right'): void {
    if (this.socket.status !== 'connected') {
      return;
    }

    this.socket.send({ type: 'event:preview', direction });
  }

  vote(optionIndex: number, quantity?: number): void {
    if (this.socket.status !== 'connected' || this.state.status !== 'voting') {
      return;
    }

    if (optionIndex < 0 || optionIndex >= this.state.options.length) {
      return;
    }

    this.state.votedOption = optionIndex;
    this.socket.send({ type: 'vote', optionIndex, quantity });
  }

  continueAfterEvent(): void {
    if (this.socket.status !== 'connected') {
      return;
    }

    if (this.state.endedContinue) {
      return;
    }

    this.state.endedContinue = true;
    this.socket.send({ type: 'event:continue' });
    this.refresh();
  }

  reset(): void {
    this.state.title = '';
    this.state.description = '';
    this.state.options = [];
    this.state.status = 'voting';
    this.state.mode = 'group';
    this.state.totalSeconds = 45;
    this.state.secondsLeft = 0;
    this.state.results = [];
    this.state.selectedOption = null;
    this.state.selectedPlayer = null;
    this.state.votedOption = null;
    this.state.active = false;
    this.state.sequence = 0;
    this.clearEndedState();
    this.clearResultState();
    this.state.preview = false;
    this.state.won = false;
    this.state.winMessage = null;
    this.stopCountdown();
  }

  private applyBaseState(data: { [key: string]: unknown }, preview: boolean): void {
    this.state.preview = preview;
    this.state.title = String(data['title'] ?? '');
    this.state.description = String(data['description'] ?? '');
    this.state.options = Array.isArray(data['options']) ? (data['options'] as EventOption[]) : [];
    this.state.mode = (data['mode'] as EventMode) ?? 'group';
  }

  private clearEndedState(): void {
    this.state.endedMessage = null;
    this.state.endedColor = null;
    this.state.endedDemonText = null;
    this.state.endedContinue = false;
  }

  private clearResultState(): void {
    this.state.resultMessage = null;
    this.state.resultColor = null;
    this.state.resultDemonText = null;
  }

  private startCountdown(secondsLeft: number, status: 'voting' | 'revealed'): void {
    this.stopCountdown();
    this.state.secondsLeft = Math.max(0, secondsLeft);
    if (this.state.secondsLeft <= 0) {
      return;
    }

    this.countdownTimer = setInterval(() => {
      const next = this.state.secondsLeft - 0.5;
      if (next <= 0) {
        this.state.secondsLeft = 0;
        this.stopCountdown();
      } else {
        this.state.secondsLeft = next;
      }
      this.refresh();
    }, 500);
  }

  private stopCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = undefined;
    }
  }
}
