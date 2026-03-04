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

  it('uses shared tooltip bindings for event options and skill option modals', () => {
    const eventTemplate = readFileSync(
      'c:\\Users\\charl\\OneDrive\\Desktop\\Trust Crawl\\trust-crawl\\client\\src\\app\\pages\\event\\event.page.html',
      'utf8',
    );
    const restingTemplate = readFileSync(
      'c:\\Users\\charl\\OneDrive\\Desktop\\Trust Crawl\\trust-crawl\\client\\src\\app\\pages\\resting\\resting.page.html',
      'utf8',
    );
    const globalStyles = readFileSync(
      'c:\\Users\\charl\\OneDrive\\Desktop\\Trust Crawl\\trust-crawl\\client\\src\\styles.css',
      'utf8',
    );

    expect(eventTemplate.includes('[class.has-tooltip]="!!option.tooltip"')).toBe(true);
    expect(eventTemplate.includes('[attr.data-tooltip]="option.tooltip || null"')).toBe(true);
    expect(restingTemplate.includes('[class.has-tooltip]="!!optionTooltip(option)"')).toBe(true);
    expect(restingTemplate.includes('[attr.data-tooltip]="optionTooltip(option) || null"')).toBe(true);
    expect(globalStyles.includes('.has-tooltip::after')).toBe(true);
    expect(globalStyles.includes('.has-tooltip:hover::after')).toBe(true);
  });

  it('shows group event vote counts on the option list instead of a separate results list', () => {
    const eventTemplate = readFileSync(
      'c:\\Users\\charl\\OneDrive\\Desktop\\Trust Crawl\\trust-crawl\\client\\src\\app\\pages\\event\\event.page.html',
      'utf8',
    );
    const eventStyles = readFileSync(
      'c:\\Users\\charl\\OneDrive\\Desktop\\Trust Crawl\\trust-crawl\\client\\src\\app\\pages\\event\\event.page.scss',
      'utf8',
    );

    expect(eventTemplate.includes('*ngIf="showVotes()"')).toBe(true);
    expect(eventTemplate.includes('{{ votesForOption(idx) }}')).toBe(true);
    expect(eventTemplate.includes('[class.option--revealed-selected]="isRevealedGroupSelection(idx)"')).toBe(true);
    expect(eventTemplate.includes('<ul>')).toBe(false);
    expect(eventStyles.includes('.option-votes')).toBe(true);
    expect(eventStyles.includes('.option--revealed-selected')).toBe(true);
  });
});
