import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { EventService } from './services/event.service';
import { InventoryService } from './services/inventory.service';
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
  private readonly eventTotalSeconds = 45;

  constructor(
    protected readonly inventory: InventoryService,
    protected readonly event: EventService,
    protected readonly resting: RestingService,
    private readonly socket: SocketService,
    private readonly cdr: ChangeDetectorRef,
    router: Router,
  ) {
    this.router = router;
    this.socket.registerChangeDetector(this.cdr);
    this.event.registerChangeDetector(this.cdr);
    router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const nav = event as NavigationEnd;
        this.previousRoute.set(this.currentRoute());
        this.currentRoute.set(nav.urlAfterRedirects);
        this.inventory.setInventoryRouteActive(nav.urlAfterRedirects === '/inventory');
      });

    this.event.onNewEvent(() => {
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
    const remaining = this.event.state.secondsLeft;
    const percent = (remaining / this.eventTotalSeconds) * 100;
    return Math.max(0, Math.min(100, percent));
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

  protected disconnectToHome(): void {
    this.inventory.disconnect();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    this.router.navigateByUrl('/');
  }
}
