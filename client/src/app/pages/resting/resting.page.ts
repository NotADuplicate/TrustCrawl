import { NgFor, NgIf, NgTemplateOutlet } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { InventoryService } from '../../services/inventory.service';
import { RestingService } from '../../services/resting.service';
import { EventService } from '../../services/event.service';

type RestingModal =
  | 'eat'
  | 'weight'
  | 'target'
  | 'direction'
  | 'map'
  | 'option'
  | 'body'
  | 'ground';

@Component({
  selector: 'app-resting-page',
  imports: [NgIf, NgFor, NgTemplateOutlet],
  templateUrl: './resting.page.html',
  styleUrl: './resting.page.scss'
})
export class RestingPage {
  private readonly router = inject(Router);
  protected readonly inventory = inject(InventoryService);
  protected readonly resting = inject(RestingService);
  protected readonly event = inject(EventService);
  protected readonly activeModal = signal<RestingModal | null>(null);
  protected readonly pendingTargetSkill = signal<number | null>(null);
  protected readonly pendingOptionSkill = signal<number | null>(null);
  protected readonly pendingBodyItemName = signal<string | null>(null);

  constructor() {
    this.resting.onNewRest(() => {
      if (this.inventory.myHealth >= 0 && this.resting.state.campReady && !this.resting.state.haveEaten) {
        this.openModal('eat');
      }
    });
    this.resting.requestResting();
  }

  protected pickSkill(index: number): void {
    const skill = this.resting.state.skills[index];
    if (skill?.targeted) {
      this.pendingTargetSkill.set(index);
      this.openModal('target');
      return;
    }

    if (skill?.options && skill.options.length > 0) {
      this.pendingOptionSkill.set(index);
      this.openModal('option');
      return;
    }

    this.resting.pickSkill(index);
  }

  protected openModal(modal: RestingModal): void {
    this.activeModal.set(modal);
  }

  protected closeModal(modal?: RestingModal): void {
    if (modal && this.activeModal() !== modal) {
      return;
    }

    this.activeModal.set(null);
  }

  protected isModalOpen(modal: RestingModal): boolean {
    return this.activeModal() === modal;
  }

  protected eat(amount: number): void {
    this.resting.eatFood(amount);
    this.closeModal('eat');
    this.resting.requestResting();
  }

  protected camp(): void {
    if (this.resting.state.campReady && !this.resting.state.haveEaten) {
      this.openModal('eat');
      return;
    }

    this.resting.camp();
  }

  protected continueToEvent(): void {
    if (this.inventory.myInventoryWeight > this.resting.state.carryingCapacity) {
      this.openModal('weight');
      return;
    }

    const bodyItem = this.inventory.state.floorItems.find((item) =>
      item.name?.toLowerCase().includes('body')
    );
    if (bodyItem) {
      this.pendingBodyItemName.set(bodyItem.name);
      this.openModal('body');
      return;
    }

    this.openContinuePrompt();
  }

  protected selectDirection(direction: 'left' | 'right'): void {
    this.resting.continue(direction);
    this.closeModal('direction');
  }

  protected viewMap(direction: 'left' | 'right'): void {
    if (this.resting.state.scouting !== direction && !this.inventory.state.isDemon) {
      return;
    }

    this.event.requestPreview(direction);
    this.closeModal('map');
    this.router.navigateByUrl('/event');
  }

  protected selectTarget(targetName: string): void {
    const index = this.pendingTargetSkill();
    if (index === null) {
      return;
    }

    this.resting.pickTargetedSkill(index, targetName);
    this.closeModal('target');
    this.pendingTargetSkill.set(null);
  }

  protected voteAccuse(vote: boolean): void {
    this.resting.voteAccuse(vote);
  }

  protected selectOption(optionChoice: string): void {
    const index = this.pendingOptionSkill();
    if (index === null) {
      return;
    }

    this.resting.pickSkillWithOption(index, optionChoice);
    this.closeModal('option');
    this.pendingOptionSkill.set(null);
  }

  protected pendingSkillOptions(): string[] {
    return this.resting.state.skills[this.pendingOptionSkill() ?? 0]?.options || [];
  }

  protected optionTooltip(optionChoice: string): string | null {
    const skill = this.resting.state.skills[this.pendingOptionSkill() ?? 0];
    return skill?.optionTooltips?.[optionChoice] ?? null;
  }

  protected dismissBodyWarning(): void {
    this.pendingBodyItemName.set(null);
    this.closeModal('body');
  }

  protected confirmBodyWarning(): void {
    this.pendingBodyItemName.set(null);
    this.openContinuePrompt();
  }

  protected confirmGroundWarning(): void {
    this.closeModal('ground');
    this.openModal('direction');
  }

  private openContinuePrompt(): void {
    if (this.inventory.state.hasUnseenFloorItems) {
      this.openModal('ground');
      return;
    }

    this.openModal('direction');
  }
}
