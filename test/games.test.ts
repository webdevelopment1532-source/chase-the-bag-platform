import { playBlackjack, playPlinko, playMines } from '../src/games';

describe('Advanced Games', () => {
    test('Blackjack resolves a round', () => {
        const values = [0, 0.92, 0.33, 0.5, 0.84, 0.1];
        let index = 0;
        const result = playBlackjack(() => values[index++] ?? 0.2);

        expect(result).toContain('Blackjack');
        expect(result).toContain('Player:');
        expect(result).toContain('Dealer:');
        expect(result).toContain('Result:');
        expect(result).not.toContain('coming soon');
    });

    test('Plinko returns a slot and payout', () => {
        const values = [0.2, 0.7, 0.1, 0.9, 0.3, 0.8];
        let index = 0;
        const result = playPlinko(() => values[index++] ?? 0.4);

        expect(result).toContain('Plinko');
        expect(result).toContain('Landing slot:');
        expect(result).toContain('Payout:');
        expect(result).not.toContain('coming soon');
    });

    test('Mines reveals the picked tile outcome', () => {
        const values = [0.01, 0.45, 0.88, 0.2];
        let index = 0;
        const result = playMines(() => values[index++] ?? 0.6);

        expect(result).toContain('Mines');
        expect(result).toContain('Pick: tile');
        expect(result).toMatch(/Result: \*\*(Safe|Boom)/);
        expect(result).not.toContain('coming soon');
    });
});
