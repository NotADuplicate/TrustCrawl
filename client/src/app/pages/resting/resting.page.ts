import { NgFor, NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { InventoryService } from '../../services/inventory.service';
import { RestingService } from '../../services/resting.service';
import { EventService } from '../../services/event.service';

@Component({
  selector: 'app-resting-page',
  imports: [NgIf, NgFor],
  templateUrl: './resting.page.html',
  styleUrl: './resting.page.scss'
})
export class RestingPage {
  private readonly router = inject(Router);
  protected readonly inventory = inject(InventoryService);
  protected readonly resting = inject(RestingService);
  protected readonly event = inject(EventService);
  protected readonly showEatPrompt = signal(false);
  protected readonly showWeightWarning = signal(false);
  protected readonly showTargetPrompt = signal(false);
  protected readonly pendingTargetSkill = signal<number | null>(null);
  protected readonly showDirectionPrompt = signal(false);
  protected readonly showMapPrompt = signal(false);
  protected readonly showOptionPrompt = signal(false);
  protected readonly pendingOptionSkill = signal<number | null>(null);

  constructor() {
    this.resting.requestResting();
  }

  protected pickSkill(index: number): void {
    const skill = this.resting.state.skills[index];
    if (skill?.targeted) {
        console.log(`Skill ${skill.name} is targeted, prompting for target selection`);
      this.pendingTargetSkill.set(index);
      this.showTargetPrompt.set(true);
      return;
    }

    if (skill?.options && skill.options.length > 0) {
        console.log(`Skill ${skill.name} has options: ${skill.options.join(', ')}`);
      this.pendingOptionSkill.set(index);
      this.showOptionPrompt.set(true);
      return;
    }

    this.resting.pickSkill(index);
  }

  protected openEatPrompt(): void {
    this.showEatPrompt.set(true);
  }

  protected closeEatPrompt(): void {
    this.showEatPrompt.set(false);
  }

  protected eat(amount: number): void {
    this.resting.eatFood(amount);
    this.showEatPrompt.set(false);
    this.resting.requestResting();
  }

  protected continueToEvent(): void {
    if (this.inventory.myInventoryWeight > this.resting.state.carryingCapacity) {
        console.log('Too much weight to continue');
      this.showWeightWarning.set(true);
      return;
    }

    this.showDirectionPrompt.set(true);
  }

  protected closeWeightWarning(): void {
    this.showWeightWarning.set(false);
  }

  protected closeTargetPrompt(): void {
    this.showTargetPrompt.set(false);
    this.pendingTargetSkill.set(null);
  }

  protected closeOptionPrompt(): void {
    this.showOptionPrompt.set(false);
    this.pendingOptionSkill.set(null);
  }

  protected closeDirectionPrompt(): void {
    this.showDirectionPrompt.set(false);
  }

  protected selectDirection(direction: 'left' | 'right'): void {
    this.resting.continue(direction);
    this.showDirectionPrompt.set(false);
  }

  protected openMapPrompt(): void {
    this.showMapPrompt.set(true);
  }

  protected closeMapPrompt(): void {
    this.showMapPrompt.set(false);
  }

  protected viewMap(direction: 'left' | 'right'): void {
    if(this.resting.state.scouting !== direction && !this.inventory.state.isDemon) {
        console.log(`Cannot view ${direction} path, not scouted and not a demon`);
      return;
    }
    this.event.requestPreview(direction);
    this.showMapPrompt.set(false);
    this.router.navigateByUrl('/event');
  }

  protected selectTarget(targetName: string): void {
    const index = this.pendingTargetSkill();
    if (index === null) {
      return;
    }

    this.resting.pickTargetedSkill(index, targetName);
    this.showTargetPrompt.set(false);
    this.pendingTargetSkill.set(null);
  }

  protected selectOption(optionChoice: string): void {
    const index = this.pendingOptionSkill();
    if (index === null) {
      return;
    }

    this.resting.pickSkillWithOption(index, optionChoice);
    this.showOptionPrompt.set(false);
    this.pendingOptionSkill.set(null);
  }

  protected selectedLabel(): string {
    return "blah";
    /*const index = this.resting.state.selectedSkill;
    if (index === null || index === undefined) {
      return 'No skill selected yet.';
    }

    const skill = this.resting.state.skills[index];
    return skill ? skill.name : 'No skill selected yet.';*/
  }
}
