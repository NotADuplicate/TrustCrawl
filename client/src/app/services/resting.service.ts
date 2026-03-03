import { Injectable } from '@angular/core';
import { Service } from './service';
import { SocketService } from './socket.service';

export type Skill = {
  name: string;
  description: string;
  targeted?: boolean;
  options?: string[];
  demon?: boolean;
};

export type RestingState = {
  title: string;
  skills: Skill[];
  selectedSkills: number[];
  skillText: string | null;
  camped: boolean;
  campReady: boolean;
  haveEaten: boolean;
  sequence: number;
  continued: boolean;
  carryingCapacity: number;
  scouting: 'left' | 'right' | 'neither';
  directionVote: 'left' | 'right' | null;
  accuseActive: boolean;
  accuseAccuser: string | null;
  accuseAccused: string | null;
  accuseVoted: boolean;
  active: boolean;
  totalSeconds: number;
  secondsLeft: number;
};

@Injectable({ providedIn: 'root' })
export class RestingService extends Service {
  readonly state: RestingState = {
    title: '',
    skills: [],
    selectedSkills: [],
    skillText: null,
    camped: false,
    campReady: false,
    haveEaten: false,
    sequence: 0,
    continued: false,
    scouting: 'neither',
    carryingCapacity: 6,
    directionVote: null,
    accuseActive: false,
    accuseAccuser: null,
    accuseAccused: null,
    accuseVoted: false,
    active: false,
    totalSeconds: 0,
    secondsLeft: 0,
  };

  private readonly listeners: Array<() => void> = [];
  private countdownTimer?: ReturnType<typeof setInterval>;

  constructor(private readonly socket: SocketService) {
    super();
    this.socket.subscribe((data) => {
      if (data.type === 'accuse') {
        this.state.accuseActive = true;
        this.state.accuseAccuser = String(data['accuser'] ?? '');
        this.state.accuseAccused = String(data['accused'] ?? '');
        this.state.accuseVoted = false;
        this.refresh();
        return;
      }

      if (data.type === 'modal') {
        this.resetAccusation();
        this.refresh();
        return;
      }

      if (data.type !== 'rest') {
        return;
      }

      this.state.sequence += 1;
      this.state.active = true;
      this.applyRestState(data);

      for (const listener of this.listeners) {
        listener();
      }

      this.refresh();
    });
  }

  onNewRest(listener: () => void): void {
    this.listeners.push(listener);
  }

  requestResting(): void {
    if (!this.canSend()) {
      return;
    }

    this.socket.send({ type: 'rest:request' });
  }

  pickSkill(index: number): void {
    if (!this.canSelectSkill(index)) {
      return;
    }

    this.markSkillSelected(index);
    this.socket.send({ type: 'rest:pick', optionIndex: index });
  }

  pickSkillWithOption(index: number, optionChoice: string): void {
    if (!this.canSelectSkill(index)) {
      return;
    }

    const choice = optionChoice.trim();
    if (!choice) {
      return;
    }

    this.markSkillSelected(index);
    this.socket.send({ type: 'rest:pick', optionIndex: index, optionChoice: choice });
  }

  pickTargetedSkill(index: number, targetName: string): void {
    if (!this.canSelectSkill(index)) {
      return;
    }

    const trimmedTarget = targetName.trim();
    if (!trimmedTarget) {
      return;
    }

    this.markSkillSelected(index);
    this.socket.send({ type: 'rest:pick', optionIndex: index, targetName: trimmedTarget });
  }

  camp(): void {
    if (!this.canSend() || this.state.camped || this.state.haveEaten) {
      return;
    }

    this.state.camped = true;
    this.socket.send({ type: 'rest:camp' });
    this.refresh();
  }

  eatFood(amount: number): void {
    if (!this.canSend() || !this.state.campReady) {
      return;
    }

    const clamped = Math.max(0, Math.min(2, Math.floor(amount)));
    this.state.haveEaten = true;
    this.socket.send({ type: 'rest:eat', eatAmount: clamped });
    this.refresh();
  }

  continue(direction: 'left' | 'right'): void {
    if (!this.canSend()) {
      return;
    }

    if (this.state.continued) {
      return;
    }

    this.state.continued = true;
    this.state.directionVote = direction;
    this.socket.send({ type: 'rest:continue', direction });
    this.refresh();
  }

  accuse(targetName: string): void {
    if (!this.canSend()) {
      return;
    }

    const trimmed = targetName.trim();
    if (!trimmed) {
      return;
    }

    this.socket.send({ type: 'rest:accuse', accused: trimmed });
  }

  voteAccuse(vote: boolean): void {
    if (!this.canSend()) {
      return;
    }

    if (this.state.accuseVoted) {
      return;
    }

    this.state.accuseVoted = true;
    this.socket.send({ type: 'accuse:vote', vote });
    this.refresh();
  }

  reset(): void {
    this.state.title = '';
    this.state.skills = [];
    this.state.selectedSkills = [];
    this.state.skillText = null;
    this.state.camped = false;
    this.state.campReady = false;
    this.state.haveEaten = false;
    this.state.sequence = 0;
    this.state.continued = false;
    this.state.carryingCapacity = 6;
    this.state.scouting = 'neither';
    this.state.directionVote = null;
    this.state.active = false;
    this.state.totalSeconds = 0;
    this.state.secondsLeft = 0;
    this.resetAccusation();
    this.stopCountdown();
    this.refresh();
  }

  private canSend(): boolean {
    return this.socket.status === 'connected';
  }

  private canSelectSkill(index: number): boolean {
    return this.canSend() && index >= 0 && index < this.state.skills.length;
  }

  private markSkillSelected(index: number): void {
    this.state.selectedSkills.push(index);
    this.refresh();
  }

  private applyRestState(data: { [key: string]: unknown }): void {
    this.state.title = String(data['title'] ?? 'Resting');
    this.state.skills = Array.isArray(data['skills']) ? (data['skills'] as Skill[]) : [];
    this.state.selectedSkills = Array.isArray(data['selectedSkills']) ? (data['selectedSkills'] as number[]) : [];
    this.state.skillText = (data['skillText'] as string | null) ?? null;
    this.state.camped = Boolean(data['camped']);
    this.state.campReady = Boolean(data['campReady']);
    this.state.haveEaten = Boolean(data['haveEaten']);
    this.state.continued = false;
    this.state.carryingCapacity = Number(data['hauling'] ? 12 : 6);
    this.state.scouting = (data['scouting'] as 'left' | 'right' | 'neither') ?? 'neither';
    this.state.directionVote = null;
    this.state.totalSeconds = typeof data['totalSeconds'] === 'number' ? data['totalSeconds'] : this.state.totalSeconds;
    const secondsLeft = typeof data['secondsLeft'] === 'number' ? data['secondsLeft'] : 0;
    this.startCountdown(secondsLeft);
  }

  private resetAccusation(): void {
    this.state.accuseActive = false;
    this.state.accuseAccuser = null;
    this.state.accuseAccused = null;
    this.state.accuseVoted = false;
  }

  private startCountdown(secondsLeft: number): void {
    this.stopCountdown();
    this.state.secondsLeft = Math.max(0, secondsLeft);
    this.refresh();
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
