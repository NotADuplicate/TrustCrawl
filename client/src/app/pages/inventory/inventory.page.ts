import { NgFor, NgIf, NgTemplateOutlet } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { InventoryService } from '../../services/inventory.service';
import { RestingService } from '../../services/resting.service';

@Component({
  selector: 'app-inventory-page',
  imports: [NgIf, NgFor, NgTemplateOutlet],
  templateUrl: './inventory.page.html',
  styleUrl: './inventory.page.scss'
})
export class InventoryPage {
  protected readonly inventory = inject(InventoryService);
  protected readonly resting = inject(RestingService);
  protected readonly draggedItem = signal<string | null>(null);
  protected readonly draggedSource = signal<'inventory' | 'floor' | null>(null);

  protected onDragStart(itemName: string, source: 'inventory' | 'floor'): void {
    this.draggedItem.set(itemName);
    this.draggedSource.set(source);
  }

  protected onDragEnd(): void {
    this.clearDraggedItem();
  }

  protected allowDrop(event: DragEvent): void {
    event.preventDefault();
  }

  protected onDropToFloor(): void {
    const itemName = this.draggedItem();
    if (!itemName || this.draggedSource() !== 'inventory') {
      return;
    }

    this.inventory.moveToFloor(itemName);
    this.clearDraggedItem();
  }

  protected onDropToInventory(): void {
    const itemName = this.draggedItem();
    if (!itemName || this.draggedSource() !== 'floor') {
      return;
    }

    this.inventory.moveToInventory(itemName);
    this.clearDraggedItem();
  }

  protected useItem(itemName: string): void {
    this.inventory.useItem(itemName);
  }

  protected useItemOption(optionIndex: number): void {
    const itemName = this.inventory.state.itemOptionItemName;
    if (!itemName) {
      return;
    }

    this.inventory.useItemWithOption(itemName, optionIndex);
  }

  protected closeItemOptions(): void {
    this.inventory.clearItemOptions();
  }

  private clearDraggedItem(): void {
    this.draggedItem.set(null);
    this.draggedSource.set(null);
  }
}
