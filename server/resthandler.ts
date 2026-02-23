import { type WebSocket } from 'ws';
import { Game } from './game';
import { Skill } from './models/skill';
import { Player } from './models/player';
import { Craft, Scavenge, Haul, Mend, Scout } from './models/Skills';

export class RestHandler {
    private readonly skillPool: Skill[] = [
        new Craft(),
        new Scout(),
        new Scavenge(),
        new Haul(),
        new Mend(),
    ];

    private readonly playerSkills = new Map<string, Skill[]>();
    private readonly selectedSkills = new Map<string, number[]>();
    private readonly skillTexts = new Map<string, string>();
    private readonly eatenStatus = new Map<string, boolean>();
    private readonly continueVotes = new Map<string, 'left' | 'right'>();
    restActive = false;

    constructor(
        private readonly game: Game,
        private readonly onAllContinued?: (direction: 'left' | 'right', playerName: string) => void,
        private readonly onRestStarted?: () => void,
    ) { }

    resetForNewGame(): void {
        this.resetAll();
    }

    resetAll(): void {
        this.restActive = false;
        this.playerSkills.clear();
        this.selectedSkills.clear();
        this.skillTexts.clear();
        this.eatenStatus.clear();
        this.continueVotes.clear();
    }

    endRest(): void {
        this.restActive = false;
        this.selectedSkills.clear();
        this.skillTexts.clear();
        this.eatenStatus.clear();
        this.continueVotes.clear();
    }

    handleDisconnect(player: Player): void {
        this.playerSkills.delete(player.name);
        this.selectedSkills.delete(player.name);
        this.skillTexts.delete(player.name);
        this.eatenStatus.delete(player.name);
        this.continueVotes.delete(player.name);
    }

    handleContinueVote(player: Player, direction: 'left' | 'right'): void {
        if (!this.restActive) {
            return;
        }

        this.continueVotes.set(player.name, direction);
        if (this.continueVotes.size < this.game.players.length) {
            return;
        }

        const voters = Array.from(this.continueVotes.keys());
        const chosenName = voters[Math.floor(Math.random() * voters.length)];
        const chosenDirection = this.continueVotes.get(chosenName) ?? direction;
        this.continueVotes.clear();
        this.onAllContinued?.(chosenDirection, chosenName);
    }

    handleRestRequest(socket: WebSocket): void {
        if (!this.restActive) {
            this.startRest();
        }

        this.sendRestTo(socket);
    }

    handleSkillPick(player: Player, optionIndex: number, targetName?: string, optionChoice?: string): void {
        if (!this.restActive) {
            return;
        }

        const skills = this.getSkillsForPlayer(player.name);
        if (!skills || optionIndex < 0 || optionIndex >= skills.length) {
            return;
        }

        const skill = skills[optionIndex];
        let target: Player | undefined;
        if (skill.targeted) {
            if (!targetName) {
                return;
            }
            target = this.game.players.find((entry) => entry.name === targetName);
            if (!target || target.name === player.name) {
                return;
            }
        } else if (skill.options.length > 0) {
            if (!optionChoice || !skill.options.includes(optionChoice)) {
                return;
            }
        }

        if(!this.selectedSkills.has(player.name)) {
            this.selectedSkills.set(player.name, []);
        }
        this.selectedSkills.get(player.name)!.push(optionIndex);
        this.useSkill(player, skill, target, optionChoice);
    }

    handleEat(player: Player, amount: number): void {
        if (!this.restActive) {
            return;
        }

        const foodToEat = Math.max(0, Math.min(2, Math.floor(amount)));
        this.eatenStatus.set(player.name, true);
        if (foodToEat === 0) {
            return;
        }

        let eaten = 0;
        for (let i = 0; i < foodToEat; i += 1) {
            const removed = player.removeItem('Food');
            if (!removed) {
                break;
            }
            eaten += 1;
        }

        if (eaten === 0) {
            return;
        }
    }

    startRest(): void {
        if (this.game.players.length === 0) {
            return;
        }

        this.restActive = true;
        this.playerSkills.clear();
        this.selectedSkills.clear();
        this.skillTexts.clear();
        this.eatenStatus.clear();
        this.continueVotes.clear();
        for (const player of this.game.players) {
            this.getSkillsForPlayer(player.name);
            this.eatenStatus.set(player.name, false);
        }
        this.onRestStarted?.();
        this.broadcastRest();
    }

    sendRestTo(socket: WebSocket): void {
        if (socket.readyState !== socket.OPEN) {
            return;
        }

        const player = this.game.clients.get(socket);
        if (!player) {
            return;
        }

        const payload = this.buildRestPayload(player);
        socket.send(payload);
    }

    broadcastRest(): void {
        for (const [client, player] of this.game.clients.entries()) {
            if (client.readyState === client.OPEN) {
                const payload = this.buildRestPayload(player);
                client.send(payload);
            }
        }
    }

    private buildRestPayload(player: Player): string {
        const skills = this.getSkillsForPlayer(player.name) ?? [];
        return JSON.stringify({
            type: 'rest' as const,
            title: 'Resting',
            skills: skills.map((skill) => ({
                name: skill.name,
                description: skill.description,
                targeted: skill.targeted,
                options: skill.options,
            })),
            selectedSkills: this.selectedSkills.get(player.name) ?? [],
            skillText: this.skillTexts.get(player.name) ?? null,
            haveEaten: this.eatenStatus.get(player.name) ?? false,
            hauling: player.hauling,
            scouting: player.scouting,
        });
    }

    private getSkillsForPlayer(playerName: string): Skill[] {
        const existing = this.playerSkills.get(playerName);
        if (existing) {
            return existing;
        }

        const picks = this.pickSkills(2);
        this.playerSkills.set(playerName, picks);
        return picks;
    }

    private pickSkills(count: number): Skill[] {
        const pool = [...this.skillPool];
        const selected: Skill[] = [];
        while (selected.length < count && pool.length > 0) {
            const index = Math.floor(Math.random() * pool.length);
            selected.push(pool.splice(index, 1)[0]);
        }

        while (selected.length < count && this.skillPool.length > 0) {
            selected.push(this.skillPool[Math.floor(Math.random() * this.skillPool.length)]);
        }

        return selected;
    }

    private useSkill(player: Player, skill: Skill, target?: Player, optionChoice?: string): void {
        const skillText = skill.Use(player, target, optionChoice);
        player.stamina--;
        this.skillTexts.set(player.name, skillText);
        this.game.broadcastGame();
        this.sendSkillTextToPlayer(player);
    }

    private sendSkillTextToPlayer(player: Player): void {
        for (const [client, p] of this.game.clients.entries()) {
            if (player.name === p.name && client.readyState === client.OPEN) {
                const payload = this.buildRestPayload(player);
                client.send(payload);
                return;
            }
        }
    }
}
