import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canShowAccuseButton } from '../client/src/app/accuse-ui';

describe('Accuse UI', () => {
  it('only shows the HUD accuse button while resting, downed, and no accusation is active', () => {
    expect(canShowAccuseButton(false, 0, false, 'Bob')).toBe(false);
    expect(canShowAccuseButton(true, 0, false, 'Bob')).toBe(true);
    expect(canShowAccuseButton(true, 1, false, 'Bob')).toBe(false);
    expect(canShowAccuseButton(true, 0, true, 'Bob')).toBe(false);
    expect(canShowAccuseButton(true, 0, false, '   ')).toBe(false);
  });

  it('renders accusations from the HUD and not the resting page controls', () => {
    const appTemplate = readFileSync(
      'c:\\Users\\charl\\OneDrive\\Desktop\\Trust Crawl\\trust-crawl\\client\\src\\app\\app.html',
      'utf8',
    );
    const restingTemplate = readFileSync(
      'c:\\Users\\charl\\OneDrive\\Desktop\\Trust Crawl\\trust-crawl\\client\\src\\app\\pages\\resting\\resting.page.html',
      'utf8',
    );

    expect(appTemplate.includes('*ngIf="canAccusePlayer(player.name)"')).toBe(true);
    expect(appTemplate.includes('(click)="accusePlayer(player.name)"')).toBe(true);
    expect(restingTemplate.includes("(click)=\"openModal('accuse')\"")).toBe(false);
    expect(restingTemplate.includes("isModalOpen('accuse')")).toBe(false);
    expect(restingTemplate.includes('Accuse a player')).toBe(false);
  });
});
