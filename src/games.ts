type RandomSource = () => number;

const BLACKJACK_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const PLINKO_MULTIPLIERS = [0.4, 0.7, 1, 1.4, 2, 5, 2, 1.4, 1, 0.7, 0.4];
const MINE_COUNT = 3;
const MINE_TILES = 9;

function pickIndex(length: number, random: RandomSource) {
    return Math.floor(random() * length);
}

function drawBlackjackCard(random: RandomSource) {
    return BLACKJACK_RANKS[pickIndex(BLACKJACK_RANKS.length, random)];
}

function getBlackjackValue(hand: string[]) {
    let total = 0;
    let aces = 0;

    for (const card of hand) {
        if (card === 'A') {
            aces += 1;
            total += 11;
        } else if (['J', 'Q', 'K'].includes(card)) {
            total += 10;
        } else {
            total += Number(card);
        }
    }

    while (total > 21 && aces > 0) {
        total -= 10;
        aces -= 1;
    }

    return total;
}

function buildMinesBoard(minePositions: Set<number>, pickedTile: number) {
    const cells: string[] = [];

    for (let index = 0; index < MINE_TILES; index += 1) {
        if (index === pickedTile) {
            cells.push(minePositions.has(index) ? '💥' : '💎');
            continue;
        }

        cells.push('⬜');
    }

    return [cells.slice(0, 3).join(' '), cells.slice(3, 6).join(' '), cells.slice(6, 9).join(' ')].join('\n');
}

export function playBlackjack(random: RandomSource = Math.random): string {
    const playerHand = [drawBlackjackCard(random), drawBlackjackCard(random)];
    const dealerHand = [drawBlackjackCard(random), drawBlackjackCard(random)];

    while (getBlackjackValue(playerHand) < 16) {
        playerHand.push(drawBlackjackCard(random));
    }

    while (getBlackjackValue(dealerHand) < 17) {
        dealerHand.push(drawBlackjackCard(random));
    }

    const playerTotal = getBlackjackValue(playerHand);
    const dealerTotal = getBlackjackValue(dealerHand);

    let verdict = 'Push';
    if (playerTotal > 21) {
        verdict = 'Dealer wins';
    } else if (dealerTotal > 21 || playerTotal > dealerTotal) {
        verdict = 'Player wins';
    } else if (dealerTotal > playerTotal) {
        verdict = 'Dealer wins';
    }

    return `🃏 Blackjack\nPlayer: ${playerHand.join(' ')} (${playerTotal})\nDealer: ${dealerHand.join(' ')} (${dealerTotal})\nResult: **${verdict}**`;
}

export function playPlinko(random: RandomSource = Math.random): string {
    const pathSteps: string[] = [];
    let position = Math.floor((PLINKO_MULTIPLIERS.length - 1) / 2);

    for (let step = 0; step < 6; step += 1) {
        const direction = random() < 0.5 ? 'L' : 'R';
        pathSteps.push(direction);
        if (direction === 'L') {
            position = Math.max(0, position - 1);
        } else {
            position = Math.min(PLINKO_MULTIPLIERS.length - 1, position + 1);
        }
    }

    const multiplier = PLINKO_MULTIPLIERS[position];
    const lane = position + 1;

    return `🔵 Plinko\nPath: ${pathSteps.join(' -> ')}\nLanding slot: ${lane}\nPayout: **${multiplier.toFixed(1)}x**`;
}

export function playMines(random: RandomSource = Math.random): string {
    const minePositions = new Set<number>();
    while (minePositions.size < MINE_COUNT) {
        minePositions.add(pickIndex(MINE_TILES, random));
    }

    const pickedTile = pickIndex(MINE_TILES, random);
    const safePick = !minePositions.has(pickedTile);
    const safeTiles = MINE_TILES - MINE_COUNT;
    const multiplier = safePick ? (1 + MINE_COUNT / safeTiles).toFixed(2) : '0.00';
    const board = buildMinesBoard(minePositions, pickedTile);

    if (!safePick) {
        return `💣 Mines\nPick: tile ${pickedTile + 1}\n${board}\nResult: **Boom**`;
    }

    return `💣 Mines\nPick: tile ${pickedTile + 1}\n${board}\nResult: **Safe** at ${multiplier}x`;
}
