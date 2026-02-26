import { describe, expect, it } from 'vitest';
import { Game } from '../server/game';
import { Player } from '../server/models/player';
import { GamblingGround } from '../server/models/Events/gambling';
import { Food } from '../server/models/Items/Supplies/food';

describe('GamblingGround event', () => {
  it('sometimes doubles items and sometimes removes them', () => {
    let doubledSeen = false;
    let disappearedSeen = false;

    for (let i = 0; i < 10; i += 1) {
      const game = new Game(0);
      const player = new Player('Alice', game);
      game.players.push(player);
      game.floorItems = [new Food(), new Food()];

      const event = new GamblingGround([player]);
      event.game = game;

      const initialCount = game.floorItems.length;
      event.optionSelected(0, player, undefined, game);

      if (game.floorItems.length === 0) {
        disappearedSeen = true;
      } else if (game.floorItems.length > initialCount) {
        doubledSeen = true;
      } else {
        //console.error('Unexpected outcome: items neither doubled nor disappeared');
        throw new Error('Unexpected outcome: items neither doubled nor disappeared');
      }
    }

    expect(doubledSeen).toBe(true);
    expect(disappearedSeen).toBe(true);
  });
});
