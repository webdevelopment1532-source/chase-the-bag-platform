import { playBlackjack, playPlinko, playMines } from '../src/games';

function randomSequence(values: number[], fallback = 0.5) {
    let index = 0;
    return () => values[index++] ?? fallback;
}

function cardIndexToRandom(cardIndex: number) {
    return (cardIndex + 0.01) / 13;
}

describe('Games', () => {
    test('blackjack includes player, dealer, and result lines', () => {
        const result = playBlackjack(() => 0.5);
        expect(result).toContain('Blackjack');
        expect(result).toContain('Player: ');
        expect(result).toContain('Dealer: ');
        expect(result).toContain('Result: **');
        expect(result.split('\n')).toHaveLength(4);
    });

    test('blackjack draws additional cards for low totals', () => {
        const values = [0.01, 0.1, 0.15, 0.2, 0.25, 0.3];
        const result = playBlackjack(randomSequence(values));
        const playerLine = result.split('\n')[1];
        expect(playerLine.split(' ').length).toBeGreaterThan(3);
    });

    test('blackjack returns push for equal final totals', () => {
        const values = [
            cardIndexToRandom(9),
            cardIndexToRandom(8),
            cardIndexToRandom(9),
            cardIndexToRandom(8)
        ];

        const result = playBlackjack(randomSequence(values));
        expect(result).toContain('Player: 10 9 (19)');
        expect(result).toContain('Dealer: 10 9 (19)');
        expect(result).toContain('Result: **Push**');
    });

    test('blackjack returns dealer wins when dealer total beats player', () => {
        const values = [
            cardIndexToRandom(12),
            cardIndexToRandom(11),
            cardIndexToRandom(8),
            cardIndexToRandom(6),
            cardIndexToRandom(4)
        ];

        const result = playBlackjack(randomSequence(values));
        expect(result).toContain('Player: K Q (20)');
        expect(result).toContain('Dealer: 9 7 5 (21)');
        expect(result).toContain('Result: **Dealer wins**');
    });

    test('blackjack returns dealer wins when player busts', () => {
        const values = [
            cardIndexToRandom(1),
            cardIndexToRandom(2),
            cardIndexToRandom(1),
            cardIndexToRandom(2),
            cardIndexToRandom(12),
            cardIndexToRandom(12),
            cardIndexToRandom(4)
        ];

        const result = playBlackjack(randomSequence(values));
        expect(result).toContain('Player: 2 3 K K (25)');
        expect(result).toContain('Result: **Dealer wins**');
    });

    test('blackjack returns player wins when dealer busts', () => {
        const values = [
            cardIndexToRandom(9),
            cardIndexToRandom(8),
            cardIndexToRandom(8),
            cardIndexToRandom(6),
            cardIndexToRandom(12)
        ];

        const result = playBlackjack(randomSequence(values));
        expect(result).toContain('Player: 10 9 (19)');
        expect(result).toContain('Dealer: 9 7 K (26)');
        expect(result).toContain('Result: **Player wins**');
    });

    test('blackjack correctly adjusts ace value to avoid bust', () => {
        const values = [
            cardIndexToRandom(0),
            cardIndexToRandom(1),
            cardIndexToRandom(1),
            cardIndexToRandom(1),
            cardIndexToRandom(8),
            cardIndexToRandom(8),
            cardIndexToRandom(12),
            cardIndexToRandom(12)
        ];

        const result = playBlackjack(randomSequence(values));
        expect(result).toContain('Player: A 2 9 9 (21)');
        expect(result).toContain('Dealer: 2 2 K K (24)');
        expect(result).toContain('Result: **Player wins**');
    });

    test('blackjack includes every rank symbol when drawn', () => {
        const values = [
            cardIndexToRandom(3),
            cardIndexToRandom(5),
            cardIndexToRandom(7),
            cardIndexToRandom(10)
        ];

        const result = playBlackjack(randomSequence(values, 0.99));
        expect(result).toContain('Player: 4 6');
        expect(result).toContain('Dealer: 8 J (18)');
    });

    test('blackjack keeps ace at 11 for natural 21', () => {
        const values = [
            cardIndexToRandom(0),
            cardIndexToRandom(12),
            cardIndexToRandom(1),
            cardIndexToRandom(1),
            cardIndexToRandom(12),
            cardIndexToRandom(12)
        ];

        const result = playBlackjack(randomSequence(values));
        expect(result).toContain('Player: A K (21)');
        expect(result).toContain('Result: **Player wins**');
    });

    test('blackjack does not hit when player total is exactly 16', () => {
        const values = [
            cardIndexToRandom(8),
            cardIndexToRandom(6),
            cardIndexToRandom(8),
            cardIndexToRandom(8)
        ];

        const result = playBlackjack(randomSequence(values, cardIndexToRandom(12)));
        expect(result).toContain('Player: 9 7 (16)');
    });

    test('blackjack does not hit when dealer total is exactly 17', () => {
        const values = [
            cardIndexToRandom(12),
            cardIndexToRandom(11),
            cardIndexToRandom(8),
            cardIndexToRandom(7)
        ];

        const result = playBlackjack(randomSequence(values, cardIndexToRandom(12)));
        expect(result).toContain('Dealer: 9 8 (17)');
    });

    test('blackjack player wins by higher total when nobody busts', () => {
        const values = [
            cardIndexToRandom(12),
            cardIndexToRandom(11),
            cardIndexToRandom(8),
            cardIndexToRandom(7)
        ];

        const result = playBlackjack(randomSequence(values, cardIndexToRandom(12)));
        expect(result).toContain('Player: K Q (20)');
        expect(result).toContain('Dealer: 9 8 (17)');
        expect(result).toContain('Result: **Player wins**');
    });

    test('blackjack keeps player bust when multiple aces and high cards are drawn', () => {
        const values = [
            cardIndexToRandom(0),
            cardIndexToRandom(0),
            cardIndexToRandom(1),
            cardIndexToRandom(1),
            cardIndexToRandom(0),
            cardIndexToRandom(12),
            cardIndexToRandom(12)
        ];

        const result = playBlackjack(randomSequence(values, cardIndexToRandom(1)));
        expect(result).toContain('Player: A A A K K (23)');
        expect(result).toContain('Result: **Dealer wins**');
    });

    test('plinko reports a path, lane, and payout', () => {
        const result = playPlinko(() => 0.5);
        expect(result).toContain('Plinko');
        expect(result).toContain('Path: ');
        expect(result).toContain(' -> ');
        expect(result).toMatch(/Landing slot: \d+/);
        expect(result).toMatch(/Payout: \*\*[\d.]+x\*\*/);
    });

    test('plinko stays within lane bounds for extreme left and right paths', () => {
        const leftValues = [0.01, 0.01, 0.01, 0.01, 0.01, 0.01];
        const leftResult = playPlinko(randomSequence(leftValues, 0.01));
        expect(leftResult).toContain('Landing slot: 1');

        const rightValues = [0.99, 0.99, 0.99, 0.99, 0.99, 0.99];
        const rightResult = playPlinko(randomSequence(rightValues, 0.99));
        expect(rightResult).toContain('Landing slot: 11');
    });

    test('plinko uses exactly six steps and maps 0.5 to right', () => {
        const result = playPlinko(randomSequence([0.5, 0.5, 0.5, 0.5, 0.5, 0.5], 0.5));
        const lines = result.split('\n');
        expect(lines[1]).toBe('Path: R -> R -> R -> R -> R -> R');
        expect(result).toContain('Landing slot: 11');
        expect(result).toContain('Payout: **0.4x**');
    });

    test('plinko mixed path validates starting position math', () => {
        const result = playPlinko(randomSequence([0.1, 0.9, 0.9, 0.9, 0.9, 0.9], 0.9));
        expect(result).toContain('Path: L -> R -> R -> R -> R -> R');
        expect(result).toContain('Landing slot: 10');
        expect(result).toContain('Payout: **0.7x**');
    });

    test('mines returns a bounded pick and a result', () => {
        const values = [0.1, 0.2, 0.3, 0.4];
        const result = playMines(randomSequence(values));
        expect(result).toContain('Mines');
        expect(result).toMatch(/Pick: tile [1-9]/);
        expect(result).toMatch(/Result: \*\*(Boom|Safe)(?:\*\*|\*\* at [\d.]+x)/);
    });

    test('mines does not hang when random repeats', () => {
        const result = playMines(() => 0.5);
        expect(result).toContain('Mines');
        expect(result).toMatch(/Pick: tile [1-9]/);
    });

    test('mines safe path includes multiplier', () => {
        const values = [0.0, 0.12, 0.24, 0.95];
        const result = playMines(randomSequence(values, 0.95));
        expect(result).toContain('Pick: tile 9');
        expect(result).toContain('Result: **Safe** at 1.50x');
        expect(result).toContain('💎');
        expect(result).toContain('⬜ ⬜ ⬜\n⬜ ⬜ ⬜\n⬜ ⬜ 💎');
    });

    test('mines boom path includes boom result', () => {
        const values = [0.0, 0.12, 0.24, 0.05];
        const result = playMines(randomSequence(values, 0.05));
        expect(result).toContain('Pick: tile 1');
        expect(result).toContain('Result: **Boom**');
        expect(result).toContain('💥');
        expect(result).toContain('💥 ⬜ ⬜\n⬜ ⬜ ⬜\n⬜ ⬜ ⬜');
    });

    test('mines fallback placement still completes with repeated random values', () => {
        const result = playMines(randomSequence([0, 0, 0, 0], 0));
        expect(result).toContain('Pick: tile 1');
        expect(result).toContain('Result: **Boom**');
    });

    test('mines repeated random uses exactly 101 random calls total', () => {
        let calls = 0;
        const result = playMines(() => {
            calls += 1;
            return 0;
        });

        expect(result).toContain('Pick: tile 1');
        expect(calls).toBe(101);
    });

    test('mines fallback adds expected mine tiles for tile 2 pick', () => {
        const values = new Array(100).fill(0);
        values.push(0.12);
        const result = playMines(randomSequence(values, 0));
        expect(result).toContain('Pick: tile 2');
        expect(result).toContain('Result: **Boom**');
    });

    test('mines does not add a fourth mine in fallback loop', () => {
        const values = new Array(100).fill(0);
        values.push(0.4);
        const result = playMines(randomSequence(values, 0));
        expect(result).toContain('Pick: tile 4');
        expect(result).toContain('Result: **Safe** at 1.50x');
    });
});
