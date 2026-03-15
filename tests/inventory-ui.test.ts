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

  it('uses wrapping modal actions so item option buttons stay inside the modal', () => {
    const appTemplate = readFileSync(
      'c:\\Users\\charl\\OneDrive\\Desktop\\Trust Crawl\\trust-crawl\\client\\src\\app\\app.html',
      'utf8',
    );
    const globalStyles = readFileSync(
      'c:\\Users\\charl\\OneDrive\\Desktop\\Trust Crawl\\trust-crawl\\client\\src\\styles.css',
      'utf8',
    );

    expect(appTemplate.includes('inventory.state.itemOptionChoices')).toBe(true);
    expect(appTemplate.includes('class="modal-actions"')).toBe(true);
    expect(globalStyles.includes('flex-wrap: wrap;')).toBe(true);
    expect(globalStyles.includes('.modal-actions > *')).toBe(true);
  });

  it('shows carrying capacity from inventory state instead of a hardcoded 6', () => {
    const template = readFileSync(
      'c:\\Users\\charl\\OneDrive\\Desktop\\Trust Crawl\\trust-crawl\\client\\src\\app\\pages\\inventory\\inventory.page.html',
      'utf8',
    );

    expect(template.includes('inventory.myCarryingCapacity')).toBe(true);
    expect(template.includes('/ 6')).toBe(false);
  });
});
