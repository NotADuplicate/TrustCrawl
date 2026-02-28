import { type WebSocket } from 'ws';
import { Game } from './game';
import { Skill } from './models/skill';
import { Player } from './models/player';
import { Haul, Mend, Scout, Forage, Hunt, Cook, Scavenge, Craft, Prepare, Endure } from './models/Skills';
import { Chest } from './models/Items/chest';
import { Key } from './models/Items/Supplies/key';
import { Food } from './models/Items/Supplies/food';
import { Tool } from './models/Items/Supplies/tool';
import { Gold } from './models/Items/Supplies/gold';
import { Shiv } from './models/Items/Supplies/shiv';
import { Firewood } from './models/Items/Supplies/firewood';
import { Bandadge } from './models/Items/Equipment/bandadge';

export class RestHandler {
    private readonly skillPool: Skill[] = [
        new Scavenge(),
        new Scout(),
        new Forage(),
        new Haul(),
        new Mend(),
        new Hunt(),
        new Cook(),
        new Craft(),
        new Prepare(),
        new Endure(),
    ];

    private readonly playerSkills = new Map<string, Skill[]>();
    private readonly selectedSkills = new Map<string, number[]>();
    private readonly skillTexts = new Map<string, string>();
    private readonly eatenStatus = new Map<string, boolean>();
    private readonly continueVotes = new Map<string, 'left' | 'right'>();
    private readonly accuseVotes = new Map<string, boolean>();
    private currentAccuse: { accuser: string; accused: string } | null = null;
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
        this.accuseVotes.clear();
        this.currentAccuse = null;
    }

    endRest(): void {
        this.restActive = false;
        this.selectedSkills.clear();
        this.skillTexts.clear();
        this.eatenStatus.clear();
        this.continueVotes.clear();
        this.accuseVotes.clear();
        this.currentAccuse = null;
        this.game.floorItems = [];
        this.game.broadcastGame();
    }

    handleDisconnect(player: Player): void {
        this.playerSkills.delete(player.name);
        this.selectedSkills.delete(player.name);
        this.skillTexts.delete(player.name);
        this.eatenStatus.delete(player.name);
        this.continueVotes.delete(player.name);
        this.accuseVotes.delete(player.name);
    }

    handleAccuse(player: Player, targetName: string): void {
        if (!this.restActive || player.health < 0) {
            return;
        }

        const trimmedTarget = targetName.trim();
        if (!trimmedTarget || trimmedTarget === player.name) {
            return;
        }

        const target = this.game.players.find((entry) => entry.name === trimmedTarget);
        if (!target) {
            return;
        }

        this.currentAccuse = { accuser: player.name, accused: trimmedTarget };
        this.accuseVotes.clear();
        this.broadcastAccuse();
    }

    handleAccuseVote(player: Player, vote: boolean): void {
        if (!this.currentAccuse || player.health < 0) {
            return;
        }

        this.accuseVotes.set(player.name, vote);
        if (this.accuseVotes.size < this.game.players.filter(p => p.health>0).length) {
            return;
        }

        const yesVotes = Array.from(this.accuseVotes.values()).filter((value) => value).length;
        const noVotes = this.accuseVotes.size - yesVotes;
        const accused = this.currentAccuse.accused;
        if (yesVotes > noVotes) {
            const target = this.game.players.find((entry) => entry.name === accused);
            if (target) {
                target.kill();
            }
        }
        this.accuseVotes.clear();
        this.currentAccuse = null;
        this.broadcastAccuseResult(accused, yesVotes, noVotes);
    }

    handleContinueVote(player: Player, direction: 'left' | 'right'): void {
        if (!this.restActive || player.health < 1) {
            return;
        }

        this.continueVotes.set(player.name, direction);
        if (this.continueVotes.size < this.game.players.filter(p => p.health>0).length) {
            return;
        }

        const voters = Array.from(this.continueVotes.keys());
        const chosenName = voters[Math.floor(Math.random() * voters.length)];
        const chosenDirection = this.continueVotes.get(chosenName) ?? direction;
        this.continueVotes.clear();
        this.resolveUncarriedBodies();
        this.onAllContinued?.(chosenDirection, chosenName);
    }

    handleRestRequest(socket: WebSocket): void {
        if (!this.restActive) {
            this.startRest();
        }

        this.sendRestTo(socket);
    }

    handleSkillPick(player: Player, optionIndex: number, targetName?: string, optionChoice?: string): void {
        if (!this.restActive || player.health < 1) {
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
        if (!this.restActive || player.health < 0) {
            return;
        }
        if(player.sleeping) {
            player.stamina = 3;
        }

        const foodToEat = Math.max(0, Math.min(2, Math.floor(amount)));
        this.eatenStatus.set(player.name, true);
        if (foodToEat === 0) {
            player.damage(1, false);
            player.wellFed = false;
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

        if (eaten === 2) {
            if(player.wellFed) {
                player.heal(1);
            }
            player.wellFed = true;
        } else {
            player.wellFed = false;
        }
    }

    findItem(): void {
        console.log('Finding item for rest phase.');
        if(Math.random() < 0.5) {
            const value = Math.round(Math.random() * 7) + 1;
            const chest = new Chest(value);
            this.game.floorItems.push(chest);
            return;
        }
        const supplies = [Food, Tool, Gold, Bandadge];
        const supplyType = supplies[Math.floor(Math.random() * supplies.length)];
        const item = new supplyType();
        this.game.floorItems.push(item);
    }

    startRest(): void {
        console.log('Starting rest phase.');
        if (this.game.players.filter(p => p.health>0).length === 0) {
            return;
        }

        this.restActive = true;
        this.playerSkills.clear();
        this.selectedSkills.clear();
        this.skillTexts.clear();
        this.eatenStatus.clear();
        this.continueVotes.clear();
        this.accuseVotes.clear();
        this.currentAccuse = null;
        this.findItem();
        for (const player of this.game.players) {
            player.sleeping = true;
            player.scouting = 'neither';
            player.hauling = false;
            player.enduring = false;
            this.getSkillsForPlayer(player.name);
            this.eatenStatus.set(player.name, false);
        }

        this.game.currentEvent = null;
        this.game.level++;
        this.broadcastRest();
        this.game.broadcastGame();

        try {
            this.onRestStarted?.();
        } catch (error) {
            console.error('Failed to prepare rest previews.', error);
        }
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
        const skills = player.health > 0 ? this.getSkillsForPlayer(player.name) ?? [] : [];
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
        const player = this.game.players.find((p) => p.name === playerName);
        

        const picks = this.pickSkills(2);
        if (player?.preppedSkill) {
            if (!picks.some((s) => s.name === player.preppedSkill!.name)) {
                picks[0] = player.preppedSkill;
            }
            player.preppedSkill = null;
        }
        this.playerSkills.set(playerName, picks);
        return picks;
    }

    public pickSkills(count: number): Skill[] {
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
        player.sleeping = false;
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

    private resolveUncarriedBodies(): void {
        let changed = false;
        for (const player of this.game.players.filter((entry) => entry.health === 0)) {
            const bodyName = player.bodyItemName();
            const carried = this.game.players.some((entry) =>
                entry.name !== player.name && entry.inventory.some((item) => item.name === bodyName),
            );
            if (carried) {
                continue;
            }

            player.kill();
            changed = true;
        }

        if (changed) {
            this.game.broadcastGame();
        }
    }

    private broadcastAccuse(): void {
        if (!this.currentAccuse) {
            return;
        }

        for (const client of this.game.clients.keys()) {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify({
                    type: 'accuse',
                    accuser: this.currentAccuse.accuser,
                    accused: this.currentAccuse.accused,
                }));
            }
        }
    }

    private broadcastAccuseResult(accused: string, yesVotes: number, noVotes: number): void {
        for (const client of this.game.clients.keys()) {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify({
                    type: 'accuse:result',
                    accused,
                    yesVotes,
                    noVotes,
                }));
            }
        }
    }
}
