import { type WebSocket } from 'ws';
import { Game } from './game';
import { Skill } from './models/skill';
import { Player } from './models/player';
import { Haul, Mend, Scout, Forage, Hunt, Cook, Scavenge, Craft, Prepare, Endure, Train } from './models/Skills';
import { Chest } from './models/Items/chest';
import { Food } from './models/Items/Supplies/food';
import { Tool } from './models/Items/Supplies/tool';
import { Gold } from './models/Items/Supplies/gold';
import { Confuse, Disturb, Poison } from './models/Skills/DemonSkills';
import { Search } from './models/Skills/Search';
import { Investigate } from './models/Skills/Investigate';

export class RestHandler {
    private readonly skillPool: Skill[] = [
        new Scavenge(),
        new Scout(),
        new Forage(),
        //new Haul(),
        new Mend(),
        new Hunt(),
        new Cook(),
        new Craft(),
        new Prepare(),
        new Endure(),
        new Search(),
        new Investigate(),
        new Train()
    ];

    private readonly skillPoolDemon: Skill[] = [
        new Poison(),
        new Disturb(),
        new Confuse(),
    ];

    private readonly playerSkills = new Map<string, Skill[]>();
    private readonly selectedSkills = new Map<string, number[]>();
    private readonly skillTexts = new Map<string, string>();
    private readonly eatenStatus = new Map<string, boolean>();
    private readonly campVotes = new Set<string>();
    private readonly continueVotes = new Map<string, 'left' | 'right'>();
    private readonly accuseVotes = new Map<string, boolean>();
    private currentAccuse: { accuser: string; accused: string } | null = null;
    private restStartedAt = Date.now();
    private restTimerDurationMs = 0;
    private restTimer: NodeJS.Timeout | undefined;
    restActive = false;

    constructor(
        private readonly game: Game,
        private readonly onAllContinued?: (direction: 'left' | 'right', playerName: string, slowPlayers?: Player[]) => void,
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
        this.campVotes.clear();
        this.continueVotes.clear();
        this.accuseVotes.clear();
        this.currentAccuse = null;
        this.restTimerDurationMs = 0;
        if (this.restTimer) {
            clearTimeout(this.restTimer);
            this.restTimer = undefined;
        }
    }

    endRest(): void {
        this.restActive = false;
        this.selectedSkills.clear();
        this.skillTexts.clear();
        this.eatenStatus.clear();
        this.campVotes.clear();
        this.continueVotes.clear();
        this.accuseVotes.clear();
        this.currentAccuse = null;
        this.restTimerDurationMs = 0;
        if (this.restTimer) {
            clearTimeout(this.restTimer);
            this.restTimer = undefined;
        }
        this.game.floorItems = [];
        this.game.broadcastGame();
    }

    handleDisconnect(player: Player): void {
        this.playerSkills.delete(player.name);
        this.selectedSkills.delete(player.name);
        this.skillTexts.delete(player.name);
        this.eatenStatus.delete(player.name);
        this.campVotes.delete(player.name);
        this.continueVotes.delete(player.name);
        this.accuseVotes.delete(player.name);
        if (this.restActive && this.isCampReady()) {
            this.broadcastRest();
        }
    }

    handleCamp(player: Player): void {
        if (!this.restActive || player.health < 0 || this.eatenStatus.get(player.name)) {
            return;
        }

        this.campVotes.add(player.name);
        this.broadcastRest();
    }

    handleAccuse(player: Player, targetName: string): void {
        console.log(`${player.name} is accusing ${targetName}`);
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
        console.log(`${player.name} voted ${vote ? 'Yes' : 'No'} on the accusation.`);
        if (!this.currentAccuse || player.health < 0) {
            return;
        }

        this.accuseVotes.set(player.name, vote);
        if (this.accuseVotes.size < this.game.players.filter(p => p.health >= 0).length) {
            return;
        }

        console.log('All votes are in. Resolving accusation...');
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
        this.broadcastRest();
        const killed = yesVotes > noVotes;
        this.game.sendModal(
            'Accusation Result',
            killed ? `${accused} was killed.` : `${accused} survived the accusation.`,
        );
        if (killed) {
            this.game.broadcastGame();
        }
    }

    handleContinueVote(player: Player, direction: 'left' | 'right'): void {
        if (!this.restActive || player.health < 1) {
            return;
        }

        this.continueVotes.set(player.name, direction);
        if (this.continueVotes.size < this.game.players.filter(p => p.health > 0).length) {
            return;
        }

        const chosenDirection = this.resolveContinueDirection(direction);
        const chosenName = this.pickDirectionChooser(chosenDirection)
            ?? this.game.players.find((entry) => entry.health > 0)?.name
            ?? player.name;
        this.continueVotes.clear();
        this.finalizeContinue(chosenDirection, chosenName);
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
        if (skill.getInfo(player).targeted) {
            if (!targetName) {
                return;
            }
            target = this.game.players.find((entry) => entry.name === targetName);
            if (!target || target.name === player.name) {
                return;
            }
        } else if (skill.getInfo(player).options.length > 0) {
            if (!optionChoice || !skill.getInfo(player).options.includes(optionChoice)) {
                return;
            }
        }

        if (!this.selectedSkills.has(player.name)) {
            this.selectedSkills.set(player.name, []);
        }
        this.selectedSkills.get(player.name)!.push(optionIndex);
        this.useSkill(player, skill, target, optionChoice);
    }

    handleEat(player: Player, amount: number): void {
        if (!this.restActive || player.health < 0) {
            return;
        }
        if (player.sleeping) {
            if(player.disturbed) {
                this.game.sendModal('Sleep Disturbed', 'Your rest was disturbed! You do not regain stamina this turn.', player);
            } else {
                player.stamina = player.maxStamina;
            }
        }
        player.disturbed = false;

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
            if(removed instanceof Food && removed.poisoned) { 
                player.damage(1, false);
                this.game.sendModal('Poisoned food!', 'You have eaten poisoned food and took 1 damage.', player);
            }
            eaten += 1;
        }

        if (eaten === 2) {
            if (player.wellFed) {
                player.heal(1);
            }
            player.wellFed = true;
        } else {
            player.wellFed = false;
        }
    }

    findItem(): void {
        console.log('Finding item for rest phase.');
        if (Math.random() < 0.5) {
            const value = Math.round(Math.random() * 7) + 1;
            const chest = new Chest(value);
            this.game.floorItems.push(chest);
            return;
        }
        const supplies = [Food, Tool, Gold];
        const supplyType = supplies[Math.floor(Math.random() * supplies.length)];
        const item = new supplyType();
        this.game.floorItems.push(item);
    }

    startRest(): void {
        console.log('Starting rest phase.');
        if (this.game.players.filter(p => p.health > 0).length === 0) {
            return;
        }

        this.restActive = true;
        this.playerSkills.clear();
        this.selectedSkills.clear();
        this.skillTexts.clear();
        this.eatenStatus.clear();
        this.campVotes.clear();
        this.continueVotes.clear();
        this.accuseVotes.clear();
        this.currentAccuse = null;
        this.findItem();
        this.restStartedAt = Date.now();
        this.restTimerDurationMs = this.game.getRestTimerMs();
        for (const player of this.game.players) {
            player.sleeping = true;
            player.scouting = 'neither';
            player.hauling = false;
            player.enduring = false;
            player.investigating = false;
            this.getSkillsForPlayer(player.name);
            this.eatenStatus.set(player.name, false);
        }

        this.game.currentEvent = null;
        this.game.level++;
        this.broadcastRest();
        this.game.broadcastGame();
        this.startRestTimer();

       // try {
            this.onRestStarted?.();
        // } catch (error) {
        //     console.error('Failed to prepare rest previews.', error);
        // }
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
        const canReceivePrompts = player.health >= 0;
        return JSON.stringify({
            type: 'rest' as const,
            title: 'Resting',
            skills: skills.map((skill) => ({
                name: skill.getInfo(player).name,
                description: skill.getInfo(player).description,
                targeted: skill.getInfo(player).targeted,
                options: skill.getInfo(player).options,
                optionTooltips: skill.getInfo(player).optionTooltips,
                demon: this.skillPoolDemon.some((demonSkill) => demonSkill.getInfo(player).name === skill.getInfo(player).name),
            })),
            selectedSkills: this.selectedSkills.get(player.name) ?? [],
            skillText: this.skillTexts.get(player.name) ?? null,
            camped: canReceivePrompts && this.campVotes.has(player.name),
            campReady: canReceivePrompts && this.isCampReady(),
            haveEaten: this.eatenStatus.get(player.name) ?? false,
            hauling: player.hauling,
            carryingCapacity: this.getCarryCapacity(player),
            scouting: player.scouting,
            totalSeconds: Math.ceil(this.restTimerDurationMs / 1000),
            secondsLeft: this.getRestSecondsLeft(),
        });
    }

    private getSkillsForPlayer(playerName: string): Skill[] {
        const existing = this.playerSkills.get(playerName);
        if (existing) {
            return existing;
        }
        const player = this.game.players.find((p) => p.name === playerName);

        const picks = this.pickSkills(2, player);
        if (player?.isDemon) {
            const demonPickIndex = Math.floor(Math.random() * this.skillPoolDemon.length);
            picks[2] = this.skillPoolDemon[demonPickIndex];
        }
        if (player?.preppedSkill) {
            if (!picks.some((s) => s.getInfo(player).name === player.preppedSkill!.getInfo(player).name)) {
                picks[0] = player.preppedSkill;
            }
            player.preppedSkill = null;
        }
        player!.lastSkills = picks;
        this.playerSkills.set(playerName, picks);
        return picks;
    }

    private isCampReady(): boolean {
        return this.campVotes.size >= this.game.players.filter((player) => player.health >= 0).length;
    }

    public pickSkills(count: number, player?: Player): Skill[] {
        const pool = [...this.skillPool];
        const selected: Skill[] = [];
        while (selected.length < count && pool.length > 0) {
            const index = Math.floor(Math.random() * pool.length);
            if(player?.lastSkills.some(s => s.getInfo(player).name === pool[index].getInfo(player).name)) {
                pool.splice(index, 1);
                continue;
            }
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

    private startRestTimer(): void {
        if (this.restTimer) {
            clearTimeout(this.restTimer);
        }

        this.restTimer = setTimeout(() => {
            this.autoResolveRest();
        }, this.restTimerDurationMs);
    }

    private autoResolveRest(): void {
        if (!this.restActive) {
            return;
        }

        const slowPlayers = this.game.players.filter(
            (player) => player.health > 0 && !this.continueVotes.has(player.name),
        );

        for (const player of this.game.players.filter((entry) => entry.health >= 0)) {
            if (!this.eatenStatus.get(player.name)) {
                const autoEatAmount = player.inventory.some((item) => item.name === 'Food') ? 1 : 0;
                this.handleEat(player, autoEatAmount);
            }

            this.dropUntilCarryLimit(player);
        }

        this.broadcastRest();
        this.game.broadcastGame();

        const fallbackDirection: 'left' | 'right' = Math.random() < 0.5 ? 'left' : 'right';
        const direction = this.resolveContinueDirection(fallbackDirection);
        const chooserName = this.pickDirectionChooser(direction);
        const chooser = (chooserName
            ? this.game.players.find((entry) => entry.name === chooserName)
            : undefined)
            ?? this.game.players.find((entry) => entry.health > 0)
            ?? this.game.players[0];
        if (!chooser) {
            return;
        }

        this.finalizeContinue(direction, chooser.name, slowPlayers);
    }

    private finalizeContinue(direction: 'left' | 'right', playerName: string, slowPlayers?: Player[]): void {
        if (this.restTimer) {
            clearTimeout(this.restTimer);
            this.restTimer = undefined;
        }

        this.restTimerDurationMs = 0;
        this.resolveUncarriedBodies();
        this.onAllContinued?.(direction, playerName, slowPlayers);
    }

    private dropUntilCarryLimit(player: Player): void {
        const capacity = this.getCarryCapacity(player);
        while (player.inventory.reduce((sum, item) => sum + item.weight, 0) > capacity) {
            const maxWeight = Math.max(...player.inventory.map((item) => item.weight));
            const heaviestItems = player.inventory.filter((item) => item.weight === maxWeight);
            const dropItem = heaviestItems[Math.floor(Math.random() * heaviestItems.length)];
            if (!dropItem) {
                return;
            }

            const removed = player.removeItem(dropItem.name);
            if (!removed) {
                return;
            }

            this.game.floorItems.push(removed);
        }
    }

    private getCarryCapacity(player: Player): number {
        return player.hauling ? player.carryingCapacity * 2 : player.carryingCapacity;
    }

    private getRestSecondsLeft(): number {
        const elapsedMs = Date.now() - this.restStartedAt;
        return Math.max(0, Math.ceil((this.restTimerDurationMs - elapsedMs) / 1000));
    }

    private resolveContinueDirection(fallback: 'left' | 'right'): 'left' | 'right' {
        let leftVotes = 0;
        let rightVotes = 0;
        for (const vote of this.continueVotes.values()) {
            if (vote === 'left') {
                leftVotes++;
            } else {
                rightVotes++;
            }
        }

        if (leftVotes === 0 && rightVotes === 0) {
            return fallback;
        }
        if (leftVotes > rightVotes) {
            return 'left';
        }
        if (rightVotes > leftVotes) {
            return 'right';
        }
        return Math.random() < 0.5 ? 'left' : 'right';
    }

    private pickDirectionChooser(direction: 'left' | 'right'): string | null {
        const voters = Array.from(this.continueVotes.entries())
            .filter(([, vote]) => vote === direction)
            .map(([name]) => name);
        if (voters.length === 0) {
            return null;
        }
        return voters[Math.floor(Math.random() * voters.length)] ?? null;
    }

    private broadcastAccuse(): void {
        if (!this.currentAccuse) {
            return;
        }

        for (const [client, player] of this.game.clients.entries()) {
            if (client.readyState === client.OPEN && player.health >= 0) {
                client.send(JSON.stringify({
                    type: 'accuse',
                    accuser: this.currentAccuse.accuser,
                    accused: this.currentAccuse.accused,
                }));
            }
        }
    }

}
