import { playBlackjack, playPlinko, playMines } from '../src/games';

describe('Advanced Games', () => {
    test('Blackjack placeholder', () => {
        expect(playBlackjack()).toContain('Blackjack');
    });
    test('Plinko placeholder', () => {
        expect(playPlinko()).toContain('Plinko');
    });
    test('Mines placeholder', () => {
        expect(playMines()).toContain('Mines');
    });
});
