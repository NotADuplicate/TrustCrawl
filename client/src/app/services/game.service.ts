import { Injectable, computed, signal } from '@angular/core';

export type GameItem = {
  name: string;
  description: string;
  weight: number;
};

export type PlayerState = {
  name: string;
  health: number;
  stamina: number;
  inventory: GameItem[];
};

export type EventOption = {
  description: string;
  available?: boolean;
  demonText?: string;
};

export type EventMode = 'group' | 'individual';

export type Skill = {
  name: string;
  description: string;
  targeted?: boolean;
};

type ServerMessage =
  | {
      type: 'state';
      players: string[];
      isHost?: boolean;
      gameStarted?: boolean;
    }
  | {
      type: 'game';
      players: PlayerState[];
      floor: GameItem[];
      isDemon?: boolean;
    }
  | {
      type: 'event';
      title: string;
      description?: string;
      options: EventOption[];
      mode: EventMode;
      secondsLeft: number;
      status: 'voting' | 'revealed';
      results?: Array<{ optionIndex: number; votes: number }>;
      selectedOption?: number | null;
      selectedPlayer?: string | null;
    }
  | {
      type: 'rest';
      title?: string;
      skills: Skill[];
      selectedSkill?: number | null;
      skillText?: string | null;
      haveEaten?: boolean;
      hauling?: boolean;
      scouting?: 'left' | 'right' | 'neither';
    };

@Injectable({ providedIn: 'root' })
export class GameService {
  readonly name = signal('');
  readonly players = signal<string[]>([]);
  readonly status = signal<'disconnected' | 'connecting' | 'connected' | 'error'>(
    'disconnected',
  );
  readonly isHost = signal(false);
  readonly gameStarted = signal(false);
  readonly gamePlayers = signal<PlayerState[]>([]);
  readonly floorItems = signal<GameItem[]>([]);
  readonly eventTitle = signal('');
  readonly eventDescription = signal('');
  readonly eventOptions = signal<EventOption[]>([]);
  readonly eventStatus = signal<'voting' | 'revealed'>('voting');
  readonly eventMode = signal<EventMode>('group');
  readonly eventSecondsLeft = signal(0);
  readonly eventResults = signal<Array<{ optionIndex: number; votes: number }>>([]);
  readonly eventSelectedOption = signal<number | null>(null);
  readonly eventSelectedPlayer = signal<string | null>(null);
  readonly eventVotedOption = signal<number | null>(null);
  readonly eventActive = signal(false);
  readonly eventSequence = signal(0);
  readonly continued = signal(false);
  readonly isDemon = signal(false);
  readonly showDemonModal = signal(false);
  readonly restTitle = signal('');
  readonly restSkills = signal<Skill[]>([]);
  readonly restSelectedSkill = signal<number | null>(null);
  readonly restSkillText = signal<string | null>(null);
  readonly restActive = signal(false);
  readonly restSequence = signal(0);
  readonly restHaveEaten = signal(false);
  readonly carryingCapacity = signal(6);
  readonly scouting = signal<'left' | 'right' | 'neither'>('neither');
  private readonly demonModalDismissed = signal(false);

  readonly connected = computed(() => this.status() === 'connected');
  readonly otherPlayers = computed(() => {
    const selfName = this.name().trim();
    return this.players().filter((player) => player !== selfName);
  });
  readonly myInventory = computed(() => {
    const selfName = this.name().trim();
    const player = this.gamePlayers().find((entry) => entry.name === selfName);
    return player?.inventory ?? [];
  });
  readonly myInventoryWeight = computed(() =>
    this.myInventory().reduce((total, item) => total + (item.weight ?? 0), 0),
  );
  readonly myFoodCount = computed(() =>
    this.myInventory().filter((item) => item.name.toLowerCase() === 'food').length,
  );
  readonly myHealth = computed(() => {
    const selfName = this.name().trim();
    const player = this.gamePlayers().find((entry) => entry.name === selfName);
    return player?.health ?? 0;
  });
  readonly myStamina = computed(() => {
    const selfName = this.name().trim();
    const player = this.gamePlayers().find((entry) => entry.name === selfName);
    return player?.stamina ?? 0;
  });
  readonly otherPlayersHealth = computed(() => {
    const selfName = this.name().trim();
    return this.gamePlayers().filter((entry) => entry.name !== selfName);
  });

  private socket?: WebSocket;
  private countdownTimer?: ReturnType<typeof setInterval>;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectAttempts = 0;
  private manuallyDisconnected = false;
  private readonly storageKey = 'trust-crawl-name';
  private readonly demonDismissedKeyPrefix = 'trust-crawl-demon-dismissed';

  constructor() {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const savedName = localStorage.getItem(this.storageKey);
    if (savedName) {
      this.name.set(savedName);
      const dismissedKey = this.getDemonDismissedKey(savedName);
      const dismissed = localStorage.getItem(dismissedKey) === 'true';
      this.demonModalDismissed.set(dismissed);
      this.connect();
    }
  }

  connect(): void {
    if (!this.name().trim() || this.connected()) {
      return;
    }

    this.manuallyDisconnected = false;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, this.name().trim());
      const dismissedKey = this.getDemonDismissedKey(this.name().trim());
      const dismissed = localStorage.getItem(dismissedKey) === 'true';
      this.demonModalDismissed.set(dismissed);
    }
    this.openSocket();
  }

  private openSocket(): void {
    this.status.set('connecting');

    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${location.host}`;

    const socket = new WebSocket(wsUrl);
    this.socket = socket;

    socket.addEventListener('open', () => {
      this.status.set('connected');
      this.reconnectAttempts = 0;
      socket.send(JSON.stringify({ type: 'join', name: this.name().trim() }));
    });

    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data) as ServerMessage;

        if (data.type === 'state' && Array.isArray(data.players)) {
          this.players.set(data.players);
          this.isHost.set(Boolean(data.isHost));
          this.gameStarted.set(Boolean(data.gameStarted));
          if (data.gameStarted) {
            this.continued.set(false);
          }
        }

        if (data.type === 'game' && Array.isArray(data.players) && Array.isArray(data.floor)) {
          this.gameStarted.set(true);
          this.gamePlayers.set(data.players);
          this.floorItems.set(data.floor);
          this.isDemon.set(Boolean(data.isDemon));
          const shouldShowDemon = Boolean(data.isDemon) && !this.demonModalDismissed();
          this.showDemonModal.set(shouldShowDemon);
          this.eventTitle.set('');
          this.eventOptions.set([]);
          this.eventStatus.set('voting');
          this.eventMode.set('group');
          this.eventResults.set([]);
          this.eventSelectedOption.set(null);
          this.eventSelectedPlayer.set(null);
          this.eventVotedOption.set(null);
          this.eventActive.set(false);
          this.restTitle.set('');
          this.restSkills.set([]);
          this.restSelectedSkill.set(null);
          this.restSkillText.set(null);
          this.restActive.set(false);
          this.restHaveEaten.set(false);
        }

        if (data.type === 'event') {
          if (!this.eventActive()) {
            this.eventSequence.update((value) => value + 1);
          }
          this.eventActive.set(true);
          this.restActive.set(false);
          this.eventTitle.set(data.title);
          this.eventDescription.set(data.description ?? '');
          this.eventOptions.set(data.options ?? []);
          this.eventStatus.set(data.status);
          this.eventMode.set(data.mode ?? 'group');
          this.eventResults.set(data.results ?? []);
          this.eventSelectedOption.set(data.selectedOption ?? null);
          this.eventSelectedPlayer.set(data.selectedPlayer ?? null);
          if (data.status === 'voting') {
            this.eventVotedOption.set(null);
          }
          this.startCountdown(data.secondsLeft ?? 0, data.status);
        }

        if (data.type === 'rest') {
          if (!this.restActive()) {
            this.restSequence.update((value) => value + 1);
          }
          this.restActive.set(true);
          this.eventActive.set(false);
          this.stopCountdown();
          this.eventSecondsLeft.set(0);
          this.continued.set(false);
          this.restTitle.set(data.title ?? 'Resting');
          this.restSkills.set(data.skills ?? []);
          this.restSelectedSkill.set(data.selectedSkill ?? null);
          this.restSkillText.set(data.skillText ?? null);
          this.restHaveEaten.set(Boolean(data.haveEaten));
          this.carryingCapacity.set(data.hauling ? 12 : 6);
          this.scouting.set(data.scouting ?? 'neither');
        }
      } catch {
        // Ignore malformed messages
      }
    });

    socket.addEventListener('close', () => {
      if (this.manuallyDisconnected) {
        this.resetState(true);
        return;
      }

      this.status.set('disconnected');
      this.scheduleReconnect();
    });

    socket.addEventListener('error', () => {
      this.status.set('error');
    });
  }

  disconnect(): void {
    this.manuallyDisconnected = true;
    this.clearReconnectTimer();
    this.socket?.close();
    this.socket = undefined;
    this.resetState(true);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }

  startGame(): void {
    if (!this.connected() || !this.isHost() || this.gameStarted()) {
      return;
    }

    this.socket?.send(JSON.stringify({ type: 'start' }));
  }

  moveToFloor(itemName: string): void {
    if (!itemName || !this.connected() || !this.gameStarted()) {
      return;
    }

    this.socket?.send(JSON.stringify({ type: 'moveToFloor', itemName }));
  }

  moveToInventory(itemName: string): void {
    if (!itemName || !this.connected() || !this.gameStarted()) {
      return;
    }

    this.socket?.send(JSON.stringify({ type: 'moveToInventory', itemName }));
  }

  vote(optionIndex: number): void {
    if (!this.connected() || this.eventStatus() !== 'voting') {
      return;
    }

    if (optionIndex < 0 || optionIndex >= this.eventOptions().length) {
      return;
    }

    this.eventVotedOption.set(optionIndex);
    this.socket?.send(JSON.stringify({ type: 'vote', optionIndex }));
  }

  continue(): void {
    if (!this.connected() || !this.gameStarted()) {
      return;
    }

    if (this.continued()) {
      return;
    }

    this.continued.set(true);
    this.socket?.send(JSON.stringify({ type: 'continue' }));
  }

  requestEvent(): void {
    if (!this.connected() || !this.gameStarted()) {
      return;
    }

    this.socket?.send(JSON.stringify({ type: 'event:request' }));
  }

  requestResting(): void {
    if (!this.connected() || !this.gameStarted()) {
      return;
    }

    this.socket?.send(JSON.stringify({ type: 'rest:request' }));
  }

  pickSkill(index: number): void {
    if (!this.connected() || !this.gameStarted()) {
      return;
    }

    if (index < 0 || index >= this.restSkills().length) {
      return;
    }

    this.restSelectedSkill.set(index);
    this.socket?.send(JSON.stringify({ type: 'rest:pick', optionIndex: index }));
  }

  pickTargetedSkill(index: number, targetName: string): void {
    if (!this.connected() || !this.gameStarted()) {
      return;
    }

    if (index < 0 || index >= this.restSkills().length) {
      return;
    }

    const trimmedTarget = targetName.trim();
    if (!trimmedTarget) {
      return;
    }

    this.restSelectedSkill.set(index);
    this.socket?.send(
      JSON.stringify({ type: 'rest:pick', optionIndex: index, targetName: trimmedTarget }),
    );
  }

  eatFood(amount: number): void {
    if (!this.connected() || !this.gameStarted()) {
      return;
    }

    const clamped = Math.max(0, Math.min(2, Math.floor(amount)));
    this.restHaveEaten.set(true);
    this.socket?.send(JSON.stringify({ type: 'rest:eat', eatAmount: clamped }));
  }

  private resetState(clearName: boolean): void {
    this.status.set('disconnected');
    this.players.set([]);
    this.isHost.set(false);
    this.gameStarted.set(false);
    this.gamePlayers.set([]);
    this.floorItems.set([]);
    this.eventTitle.set('');
    this.eventDescription.set('');
    this.eventOptions.set([]);
    this.eventStatus.set('voting');
    this.eventMode.set('group');
    this.eventSecondsLeft.set(0);
    this.eventResults.set([]);
    this.eventSelectedOption.set(null);
    this.eventSelectedPlayer.set(null);
    this.eventVotedOption.set(null);
    this.eventActive.set(false);
    this.eventSequence.set(0);
    this.continued.set(false);
    this.isDemon.set(false);
    this.showDemonModal.set(false);
    this.restTitle.set('');
    this.restSkills.set([]);
    this.restSelectedSkill.set(null);
    this.restSkillText.set(null);
    this.restActive.set(false);
    this.restSequence.set(0);
    this.restHaveEaten.set(false);
    this.stopCountdown();
    if (clearName) {
      this.name.set('');
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || !this.name().trim()) {
      return;
    }

    const delay = Math.min(10000, 1000 * Math.max(1, this.reconnectAttempts + 1));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      if (this.manuallyDisconnected) {
        return;
      }
      this.reconnectAttempts += 1;
      this.openSocket();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  dismissDemonModal(): void {
    this.showDemonModal.set(false);
    this.demonModalDismissed.set(true);
    if (typeof localStorage !== 'undefined') {
      const dismissedKey = this.getDemonDismissedKey(this.name().trim());
      if (dismissedKey) {
        localStorage.setItem(dismissedKey, 'true');
      }
    }
  }

  private getDemonDismissedKey(name: string): string {
    if (!name.trim()) {
      return '';
    }
    return `${this.demonDismissedKeyPrefix}:${name.trim()}`;
  }

  private startCountdown(secondsLeft: number, status: 'voting' | 'revealed'): void {
    this.stopCountdown();
    this.eventSecondsLeft.set(Math.max(0, secondsLeft));

    if (status === 'revealed') {
      this.eventSecondsLeft.set(0);
      return;
    }

    this.countdownTimer = setInterval(() => {
      const next = this.eventSecondsLeft() - 1;
      if (next <= 0) {
        this.eventSecondsLeft.set(0);
        this.stopCountdown();
      } else {
        this.eventSecondsLeft.set(next);
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = undefined;
    }
  }
}
