import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { canShowAccuseButton } from './accuse-ui';
import { EventService } from './services/event.service';
import { InventoryService } from './services/inventory.service';
import { ModalService } from './services/modal.service';
import { RestingService } from './services/resting.service';
import { SocketService } from './services/socket.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NgIf, NgFor],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly currentRoute = signal('/');
  protected readonly previousRoute = signal<string | null>(null);
  private readonly router: Router;

  constructor(
    protected readonly inventory: InventoryService,
    protected readonly event: EventService,
    protected readonly resting: RestingService,
    protected readonly modal: ModalService,
    private readonly socket: SocketService,
    private readonly cdr: ChangeDetectorRef,
    router: Router,
  ) {
    this.router = router;
    this.socket.registerChangeDetector(this.cdr);
    this.event.registerChangeDetector(this.cdr);
    this.resting.registerChangeDetector(this.cdr);
    this.modal.registerChangeDetector(this.cdr);
    router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const nav = event as NavigationEnd;
        this.previousRoute.set(this.currentRoute());
        this.currentRoute.set(nav.urlAfterRedirects);
        this.inventory.setInventoryRouteActive(nav.urlAfterRedirects === '/inventory');
      });

    this.event.onNewEvent(() => {
      this.resting.reset();
      if (this.currentRoute() !== '/event') {
        this.router.navigateByUrl('/event');
      }
    });

    this.event.onGameWon(() => {
      if (this.currentRoute() !== '/win') {
        this.router.navigateByUrl('/win');
      }
    });

    this.resting.onNewRest(() => {
      this.event.reset();
      if (this.currentRoute() !== '/resting') {
        this.router.navigateByUrl('/resting');
      }
    });
  }

  protected showHud(): boolean {
    return this.currentRoute() !== '/' && this.currentRoute() !== '/win';
  }

  protected isInventoryRoute(): boolean {
    return this.currentRoute() === '/inventory';
  }

  protected inventoryButtonLabel(): string {
    return this.isInventoryRoute() ? 'Back' : 'Inventory';
  }

  protected goInventoryOrBack(): void {
    if (this.isInventoryRoute()) {
      const previous = this.previousRoute();
      this.router.navigateByUrl(previous && previous !== '/' ? previous : '/resting');
      return;
    }

    this.router.navigateByUrl('/inventory');
  }

  protected timerPercent(): number {
    const remaining = Math.max(0, this.activeTimerSeconds()-3);
    const totalSeconds = Math.max(1, this.activeTimerTotalSeconds()-3); // Subtract 3 seconds to account for the fact that the timer can show 0 for a few seconds before the event actually changes
    const percent = (remaining / totalSeconds) * 100;
    return Math.max(0, Math.min(100, percent));
  }

  protected showGlobalTimer(): boolean {
    return this.showHud() && this.activeTimerSeconds() > 0;
  }

  protected activeTimerSeconds(): number {
    if (this.event.state.active) {
      return this.event.state.secondsLeft;
    }

    if (this.resting.state.active) {
      return this.resting.state.secondsLeft;
    }

    return 0;
  }

  protected activeTimerTotalSeconds(): number {
    if (this.event.state.active) {
      return this.event.state.totalSeconds;
    }

    if (this.resting.state.active) {
      return this.resting.state.totalSeconds;
    }

    return 0;
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

  protected accusePlayer(playerName: string): void {
    if (!this.canAccusePlayer(playerName)) {
      return;
    }

    this.resting.accuse(playerName);
  }

  protected canAccusePlayer(playerName: string): boolean {
    return canShowAccuseButton(
      this.resting.state.active,
      this.inventory.myHealth,
      this.resting.state.accuseActive,
      playerName,
    );
  }

  protected disconnectToHome(): void {
    this.inventory.disconnect();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    this.router.navigateByUrl('/');
  }

  protected dismissModal(): void {
    this.modal.dismiss();
  }
}
