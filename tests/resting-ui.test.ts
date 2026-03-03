import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Resting UI', () => {
  it('styles demon rest skills differently', () => {
    const template = readFileSync(
      'c:\\Users\\charl\\OneDrive\\Desktop\\Trust Crawl\\trust-crawl\\client\\src\\app\\pages\\resting\\resting.page.html',
      'utf8',
    );
    const styles = readFileSync(
      'c:\\Users\\charl\\OneDrive\\Desktop\\Trust Crawl\\trust-crawl\\client\\src\\app\\pages\\resting\\resting.page.scss',
      'utf8',
    );

    expect(template.includes('[class.option--demon]="skill.demon"')).toBe(true);
    expect(template.includes('*ngIf="skill.demon">Demon</span>')).toBe(true);
    expect(styles.includes('.option--demon')).toBe(true);
    expect(styles.includes('.option-target--demon')).toBe(true);
  });

  it('uses the camp flow before showing the eat prompt', () => {
    const template = readFileSync(
      'c:\\Users\\charl\\OneDrive\\Desktop\\Trust Crawl\\trust-crawl\\client\\src\\app\\pages\\resting\\resting.page.html',
      'utf8',
    );

    expect(template.includes('(click)="camp()"')).toBe(true);
    expect(template.includes('>Camp</button>')).toBe(true);
    expect(template.includes("(click)=\"openModal('eat')\"")).toBe(false);
    expect(template.includes('resting.state.camped || resting.state.haveEaten')).toBe(true);
    expect(template.includes('The camp is set. How many food rations do you want to eat?')).toBe(true);
  });
});
