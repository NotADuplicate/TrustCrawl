import { NgFor, NgIf, NgTemplateOutlet } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EventService } from '../../services/event.service';
import { InventoryService } from '../../services/inventory.service';

@Component({
  selector: 'app-event-page',
  imports: [NgIf, NgFor, NgTemplateOutlet],
  templateUrl: './event.page.html',
  styleUrl: './event.page.scss'
})
export class EventPage {
  protected readonly event = inject(EventService);
  protected readonly inventory = inject(InventoryService);
  private readonly router = inject(Router);
  protected readonly showQuantityPrompt = signal(false);
  protected readonly showContinueWarning = signal(false);
  protected readonly pendingOption = signal<number | null>(null);
  protected readonly quantityValue = signal(1);

  constructor() {
    this.event.requestEvent();
  }

  protected vote(index: number): void {
    const option = this.event.state.options[index];
    if (option?.quantity) {
      this.pendingOption.set(index);
      const max = option.max ?? 0;
      this.quantityValue.set(max > 0 ? 1 : 0);
      this.showQuantityPrompt.set(true);
      return;
    }

    this.event.vote(index);
  }

  protected closeQuantityPrompt(): void {
    this.showQuantityPrompt.set(false);
    this.pendingOption.set(null);
  }

  protected confirmQuantity(): void {
    const index = this.pendingOption();
    if (index === null) {
      return;
    }

    const option = this.event.state.options[index];
    const max = option?.max ?? 0;
    const clamped = Math.max(0, Math.min(max, Math.floor(this.quantityValue())));
    this.event.vote(index, clamped);
    this.closeQuantityPrompt();
  }

  protected showVotes(): boolean {
    return this.event.state.mode === 'group' && this.event.state.status === 'revealed';
  }

  protected votesForOption(index: number): string {
    const result = this.event.state.results.find((entry) => entry.optionIndex === index);
    const votes = result?.votes ?? 0;
    return `${votes} vote${votes === 1 ? '' : 's'}`;
  }

  protected isRevealedGroupSelection(index: number): boolean {
    return this.showVotes() && this.event.state.selectedOption === index;
  }

  protected resultClass(color: string | null): string {
    switch (color) {
      case 'success':
        return 'result-banner result-success';
      case 'danger':
        return 'result-banner result-danger';
      case 'warning':
        return 'result-banner result-warning';
      case 'info':
      default:
        return 'result-banner result-info';
    }
  }

  protected continueAfterEvent(): void {
    if (this.inventory.state.hasUnseenFloorItems) {
      this.showContinueWarning.set(true);
      return;
    }

    this.confirmContinueAfterEvent();
  }

  protected confirmContinueAfterEvent(): void {
    this.showContinueWarning.set(false);
    this.event.continueAfterEvent();
  }

  protected backToResting(): void {
    this.router.navigateByUrl('/resting');
  }

  protected closeContinueWarning(): void {
    this.showContinueWarning.set(false);
  }

  protected quantityMax(): number {
    return this.event.state.options[this.pendingOption() ?? 0]?.max || 0;
  }

}
