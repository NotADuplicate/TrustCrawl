import { Injectable } from '@angular/core';
import { SocketService } from './socket.service';

export type Skill = {
  name: string;
  description: string;
  targeted?: boolean;
  options?: string[];
};

export type RestingState = {
  title: string;
  skills: Skill[];
  selectedSkills: number[];
  skillText: string | null;
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
};

@Injectable({ providedIn: 'root' })
export class RestingService {
  readonly state: RestingState = {
    title: '',
    skills: [],
    selectedSkills: [],
    skillText: null,
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
  };

  private readonly listeners: Array<() => void> = [];

  constructor(private readonly socket: SocketService) {
    this.socket.subscribe((data) => {
      if (data.type === 'accuse') {
        this.state.accuseActive = true;
        this.state.accuseAccuser = String(data['accuser'] ?? '');
        this.state.accuseAccused = String(data['accused'] ?? '');
        this.state.accuseVoted = false;
        return;
      }

      if (data.type === 'accuse:result') {
        this.state.accuseActive = false;
        this.state.accuseAccuser = null;
        this.state.accuseAccused = null;
        this.state.accuseVoted = false;
        return;
      }

      if (data.type !== 'rest') {
        return;
      }

      this.state.sequence += 1;

      this.state.title = String(data['title'] ?? 'Resting');
      this.state.skills = Array.isArray(data['skills']) ? (data['skills'] as Skill[]) : [];
      this.state.selectedSkills = Array.isArray(data['selectedSkills']) ? (data['selectedSkills'] as number[]) : [];
      this.state.skillText = (data['skillText'] as string | null) ?? null;
      this.state.haveEaten = Boolean(data['haveEaten']);
      this.state.continued = false;
      this.state.carryingCapacity = Number(data['hauling'] ? 12 : 6);
      this.state.scouting = (data['scouting'] as 'left' | 'right' | 'neither') ?? 'neither';
      this.state.directionVote = null;


      for (const listener of this.listeners) {
        listener();
      }
    });
  }

  onNewRest(listener: () => void): void {
    this.listeners.push(listener);
  }

  requestResting(): void {
    if (this.socket.status !== 'connected') {
      return;
    }

    this.socket.send({ type: 'rest:request' });
  }

  pickSkill(index: number): void {
    if (this.socket.status !== 'connected') {
      return;
    }

    if (index < 0 || index >= this.state.skills.length) {
      return;
    }

    this.state.selectedSkills.push(index);
    this.socket.send({ type: 'rest:pick', optionIndex: index });
  }

  pickSkillWithOption(index: number, optionChoice: string): void {
    console.log(`Picking skill ${index} with option "${optionChoice}"`);
    if (this.socket.status !== 'connected') {
      return;
    }

    if (index < 0 || index >= this.state.skills.length) {
      return;
    }

    const choice = optionChoice.trim();
    if (!choice) {
      return;
    }

    this.state.selectedSkills.push(index);
    this.socket.send({ type: 'rest:pick', optionIndex: index, optionChoice: choice });
  }

  pickTargetedSkill(index: number, targetName: string): void {
    if (this.socket.status !== 'connected') {
      return;
    }

    if (index < 0 || index >= this.state.skills.length) {
      return;
    }

    const trimmedTarget = targetName.trim();
    if (!trimmedTarget) {
      return;
    }

    this.state.selectedSkills.push(index);
    this.socket.send({ type: 'rest:pick', optionIndex: index, targetName: trimmedTarget });
  }

  eatFood(amount: number): void {
    if (this.socket.status !== 'connected') {
      return;
    }

    const clamped = Math.max(0, Math.min(2, Math.floor(amount)));
    this.state.haveEaten = true;
    this.socket.send({ type: 'rest:eat', eatAmount: clamped });
  }

  continue(direction: 'left' | 'right'): void {
    if (this.socket.status !== 'connected') {
      return;
    }

    if (this.state.continued) {
      return;
    }

    this.state.continued = true;
    this.state.directionVote = direction;
    this.socket.send({ type: 'rest:continue', direction });
  }

  accuse(targetName: string): void {
    if (this.socket.status !== 'connected') {
      return;
    }

    const trimmed = targetName.trim();
    if (!trimmed) {
      return;
    }

    this.socket.send({ type: 'rest:accuse', accused: trimmed });
  }

  voteAccuse(vote: boolean): void {
    if (this.socket.status !== 'connected') {
      return;
    }

    if (this.state.accuseVoted) {
      return;
    }

    this.state.accuseVoted = true;
    this.socket.send({ type: 'accuse:vote', vote });
  }

  reset(): void {
    this.state.title = '';
    this.state.skills = [];
    this.state.selectedSkills = [];
    this.state.skillText = null;
    this.state.haveEaten = false;
    this.state.sequence = 0;
    this.state.continued = false;
    this.state.directionVote = null;
    this.state.accuseActive = false;
    this.state.accuseAccuser = null;
    this.state.accuseAccused = null;
    this.state.accuseVoted = false;
  }
}
