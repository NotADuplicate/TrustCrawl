import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Inventory UI', () => {
  it('provides explicit Drop and Pick up buttons on item cards', () => {
    const template = readFileSync(
      'c:\\Users\\charl\\OneDrive\\Desktop\\Trust Crawl\\trust-crawl\\client\\src\\app\\pages\\inventory\\inventory.page.html',
      'utf8',
    );
    const styles = readFileSync(
      'c:\\Users\\charl\\OneDrive\\Desktop\\Trust Crawl\\trust-crawl\\client\\src\\app\\pages\\inventory\\inventory.page.scss',
      'utf8',
    );

    expect(template.includes('Drop')).toBe(true);
    expect(template.includes('Pick up')).toBe(true);
    expect(template.includes("(click)=\"$event.stopPropagation(); dropItem(item.name)\"")).toBe(true);
    expect(template.includes("(click)=\"$event.stopPropagation(); pickUpItem(item.name)\"")).toBe(true);
    expect(styles.includes('.item-actions')).toBe(true);
  });
});
