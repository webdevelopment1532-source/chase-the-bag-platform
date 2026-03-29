import { playBlackjack, playPlinko, playMines, playKeno, playHiLo, playWheel, playTower, playVideoPoker } from '../src/games';

function withMockedRandomSequence(values: number[], run: () => void) {
    const spy = jest.spyOn(Math, 'random');
    let i = 0;
    spy.mockImplementation(() => values[i++] ?? 0);
    try {
        run();
    } finally {
        spy.mockRestore();
    }
}

describe('Advanced Games', () => {
    test('Blackjack returns valid result', () => {
        const r = playBlackjack();
        expect(r).toContain('Blackjack');
        expect(r).toMatch(/Your hand/);
        expect(r).toMatch(/Dealer hand/);
    });

    test('Plinko returns valid result', () => {
        const r = playPlinko();
        expect(r).toContain('Plinko');
        expect(r).toMatch(/Path:/);
        expect(r).toMatch(/multiplier/);
    });

    test('Mines returns valid result', () => {
        const r = playMines();
        expect(r).toContain('Mines');
        expect(r).toMatch(/gems/);
        expect(r).toMatch(/multiplier/);
    });

    test('Keno returns valid result', () => {
        const r = playKeno();
        expect(r).toContain('Keno');
        expect(r).toMatch(/Matches:/);
    });

    test('HiLo returns valid result', () => {
        const r = playHiLo();
        expect(r).toContain('Hi-Lo');
        expect(r).toMatch(/First card/);
        expect(r).toMatch(/Next card/);
    });

    test('Wheel returns valid result', () => {
        const r = playWheel();
        expect(r).toContain('Wheel');
        expect(r).toMatch(/Landed on/);
    });

    test('Tower returns valid result', () => {
        const r = playTower();
        expect(r).toContain('Tower');
        expect(r).toMatch(/Floor/);
    });

    test('Video Poker returns valid result', () => {
        const r = playVideoPoker();
        expect(r).toContain('Video Poker');
        expect(r).toMatch(/Hand:/);
    });

    test('All games return strings', () => {
        [playBlackjack, playPlinko, playMines, playKeno, playHiLo, playWheel, playTower, playVideoPoker]
            .forEach(fn => expect(typeof fn()).toBe('string'));
    });

    test('Games are non-deterministic (different results over multiple runs)', () => {
        const results = new Set(Array.from({ length: 20 }, () => playCoinLike()));
        function playCoinLike() { return playWheel(); }
        expect(results.size).toBeGreaterThan(1);
    });

    test('Plinko counts right moves and maps to slot/multiplier deterministically', () => {
        // 8 rows, always move right.
        withMockedRandomSequence([0, 0, 0, 0, 0, 0, 0, 0], () => {
            const r = playPlinko();
            expect(r).toContain('Path: ↘↘↘↘↘↘↘↘');
            expect(r).toContain('Slot **9/9**');
            expect(r).toContain('**10x** multiplier');
        });
    });

    test('Tower clears all floors when picks avoid mines', () => {
        // For each floor: mine first door (0), pick second door (1) so every floor is safe.
        withMockedRandomSequence([
            0.0, 0.5,
            0.0, 0.5,
            0.0, 0.5,
            0.0, 0.5,
            0.0, 0.5,
        ], () => {
            const r = playTower();
            expect(r).toContain('Cleared all floors');
            expect(r).toContain('Floor 5:');
            expect(r).toContain('**8x**');
        });
    });

    test('Blackjack handles ace downgrade to avoid bust when drawing', () => {
        // Cards by random calls (rank,suit):
        // player: A, A ; dealer: 10, 7 ; player hit: 9
        withMockedRandomSequence([
            0.0, 0.0,      // A
            0.0, 0.3,      // A
            0.70, 0.6,     // 10
            0.50, 0.9,     // 7
            0.63, 0.1,     // 9 (player draw)
        ], () => {
            const r = playBlackjack();
            expect(r).toContain('Blackjack');
            expect(r).toContain('Your hand');
            expect(r).toContain('→ **21**');
            expect(r).toContain('Dealer hand');
            expect(r).toContain('→ **17**');
        });
    });

    test('Blackjack can end in push (tie)', () => {
        // player: 10,7 -> 17; dealer: 10,7 -> 17. No extra draws.
        withMockedRandomSequence([
            0.70, 0.0,
            0.50, 0.2,
            0.70, 0.4,
            0.50, 0.6,
        ], () => {
            const r = playBlackjack();
            expect(r).toContain("Push — it's a tie");
            expect(r).toContain('→ **17**');
        });
    });

    test('Blackjack covers bust and dealer-bust outcomes', () => {
        // player bust: 10, 9, 5 vs dealer 8, 8
        withMockedRandomSequence([
            0.70, 0.0,
            0.63, 0.2,
            0.55, 0.4,
            0.55, 0.6,
            0.33, 0.8,
        ], () => expect(playBlackjack()).toContain('Bust!'));

        // dealer bust: player 10, 9 ; dealer 9, 7, 10
        withMockedRandomSequence([
            0.70, 0.0,
            0.63, 0.2,
            0.63, 0.4,
            0.50, 0.6,
            0.70, 0.8,
        ], () => expect(playBlackjack()).toContain('Dealer busts'));
    });

    test('Hi-Lo covers same and wrong-prediction outcomes', () => {
        // same value case: v1=7, v2=7
        withMockedRandomSequence([0.46, 0.46, 0.0, 0.0], () => {
            const r = playHiLo();
            expect(r).toContain('Same value — push');
        });

        // wrong prediction case: v1=8 -> predicts lower, v2=13 -> actual higher
        withMockedRandomSequence([0.55, 0.95, 0.1, 0.2], () => {
            const r = playHiLo();
            expect(r).toContain('Wrong prediction');
        });
    });

    test('Video Poker covers major hand categories deterministically', () => {
        // Straight Flush: 2-6, same suit
        withMockedRandomSequence([
            0.09, 0.01,
            0.17, 0.01,
            0.25, 0.01,
            0.33, 0.01,
            0.41, 0.01,
        ], () => expect(playVideoPoker()).toContain('Straight Flush'));

        // Four of a Kind: A A A A K
        withMockedRandomSequence([
            0.01, 0.01,
            0.01, 0.26,
            0.01, 0.51,
            0.01, 0.76,
            0.95, 0.01,
        ], () => expect(playVideoPoker()).toContain('Four of a Kind'));

        // Full House: 5 5 5 9 9
        withMockedRandomSequence([
            0.33, 0.01,
            0.33, 0.26,
            0.33, 0.51,
            0.63, 0.01,
            0.63, 0.26,
        ], () => expect(playVideoPoker()).toContain('Full House'));

        // Flush (non-straight): A 3 6 8 10 same suit
        withMockedRandomSequence([
            0.01, 0.26,
            0.17, 0.26,
            0.41, 0.26,
            0.55, 0.26,
            0.70, 0.26,
        ], () => expect(playVideoPoker()).toContain('Flush'));

        // Straight (non-flush): 4-8 mixed suits
        withMockedRandomSequence([
            0.25, 0.01,
            0.33, 0.26,
            0.41, 0.51,
            0.49, 0.76,
            0.57, 0.01,
        ], () => expect(playVideoPoker()).toContain('Straight'));

        // Three of a Kind: 7 7 7 2 K
        withMockedRandomSequence([
            0.49, 0.01,
            0.49, 0.26,
            0.49, 0.51,
            0.09, 0.76,
            0.95, 0.01,
        ], () => expect(playVideoPoker()).toContain('Three of a Kind'));

        // Two Pair: 4 4 9 9 A
        withMockedRandomSequence([
            0.25, 0.01,
            0.25, 0.26,
            0.63, 0.51,
            0.63, 0.76,
            0.01, 0.01,
        ], () => expect(playVideoPoker()).toContain('Two Pair'));

        // High Card: A 3 5 9 K mixed suits/no pairs/no straight
        withMockedRandomSequence([
            0.01, 0.01,
            0.17, 0.26,
            0.33, 0.51,
            0.63, 0.76,
            0.95, 0.01,
        ], () => expect(playVideoPoker()).toContain('High Card'));

        // One Pair: A A 4 7 K
        withMockedRandomSequence([
            0.01, 0.01,
            0.01, 0.26,
            0.25, 0.51,
            0.49, 0.76,
            0.95, 0.01,
        ], () => expect(playVideoPoker()).toContain('One Pair'));
    });

    test('Keno handles duplicate random rolls before filling picks', () => {
        withMockedRandomSequence([
            0.00, 0.00, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07,
            0.00, 0.00, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07,
            0.08, 0.09, 0.10, 0.11, 0.12, 0.13, 0.14, 0.15, 0.16, 0.17, 0.18, 0.19,
            0.20, 0.21, 0.22, 0.23,
        ], () => {
            const r = playKeno();
            expect(r).toContain('Keno');
            expect(r).toContain('Matches:');
        });
    });
});
