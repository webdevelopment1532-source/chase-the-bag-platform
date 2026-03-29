// Game logic: Blackjack, Plinko, Mines, Keno, Hi-Lo, Wheel, Tower, Video Poker

const SUIT_LIST = ['♠', '♥', '♦', '♣'];
const RANK_LIST = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

interface Card { rank: string; suit: string; value: number; }

function randomCard(): Card {
    const rank = RANK_LIST[Math.floor(Math.random() * RANK_LIST.length)];
    const suit = SUIT_LIST[Math.floor(Math.random() * SUIT_LIST.length)];
    const value = rank === 'A' ? 11 : ['J', 'Q', 'K'].includes(rank) ? 10 : parseInt(rank, 10);
    return { rank, suit, value };
}

function handValue(hand: Card[]): number {
    let total = hand.reduce((sum, c) => sum + c.value, 0);
    let aces = hand.filter(c => c.value === 11).length;
    while (total > 21 && aces-- > 0) total -= 10;
    return total;
}

function cardStr(c: Card): string { return `${c.rank}${c.suit}`; }

// ── Blackjack ────────────────────────────────────────────────────────────────
export function playBlackjack(): string {
    const player: Card[] = [randomCard(), randomCard()];
    const dealer: Card[] = [randomCard(), randomCard()];
    while (handValue(player) < 17) player.push(randomCard());
    while (handValue(dealer)  < 17) dealer.push(randomCard());
    const ps = handValue(player), ds = handValue(dealer);
    let result: string;
    if      (ps > 21) result = '💥 Bust! You went over 21.';
    else if (ds > 21) result = '🎉 Dealer busts — you win!';
    else if (ps > ds) result = '🏆 You win!';
    else if (ps < ds) result = '😞 Dealer wins.';
    else              result = "🤝 Push — it's a tie.";
    return `🃏 **Blackjack**\nYour hand : ${player.map(cardStr).join(' ')} → **${ps}**\nDealer hand: ${dealer.map(cardStr).join(' ')} → **${ds}**\n${result}`;
}

// ── Plinko ───────────────────────────────────────────────────────────────────
export function playPlinko(): string {
    const mults = [10, 5, 2, 1.5, 1, 1.5, 2, 5, 10];
    let rights = 0;
    const arrows: string[] = [];
    for (let i = 0; i < 8; i++) {
        const r = Math.random() < 0.5;
        arrows.push(r ? '↘' : '↙');
        if (r) rights++;
    }
    return `🔵 **Plinko** (8 rows)\nPath: ${arrows.join('')}\nSlot **${rights + 1}/9** → **${mults[rights]}x** multiplier!`;
}

// ── Mines ────────────────────────────────────────────────────────────────────
export function playMines(): string {
    const SIZE = 5, MINES = 5, REVEALS = 5;
    const grid = Array<boolean>(SIZE * SIZE).fill(false);
    let placed = 0;
    while (placed < MINES) {
        const p = Math.floor(Math.random() * grid.length);
        if (!grid[p]) { grid[p] = true; placed++; }
    }
    const safe = grid.map((v, i) => v ? -1 : i).filter(i => i >= 0);
    const shown = new Set<number>();
    while (shown.size < Math.min(REVEALS, safe.length))
        shown.add(safe[Math.floor(Math.random() * safe.length)]);
    const rows: string[] = [];
    for (let r = 0; r < SIZE; r++) {
        let row = '';
        for (let c = 0; c < SIZE; c++) {
            const i = r * SIZE + c;
            row += grid[i] ? '💣' : shown.has(i) ? '💎' : '⬜';
        }
        rows.push(row);
    }
    const gems = shown.size;
    return `💣 **Mines** (${MINES} mines on a 5×5 grid)\n${rows.join('\n')}\nFound **${gems}** gems → **${(1 + gems * 0.6).toFixed(1)}x** multiplier!`;
}

// ── Keno ─────────────────────────────────────────────────────────────────────
export function playKeno(): string {
    const PICKS = 8, DRAWS = 20;
    const picks: number[] = [];
    while (picks.length < PICKS) {
        const n = Math.floor(Math.random() * 80) + 1;
        if (!picks.includes(n)) picks.push(n);
    }
    const drawn: number[] = [];
    while (drawn.length < DRAWS) {
        const n = Math.floor(Math.random() * 80) + 1;
        if (!drawn.includes(n)) drawn.push(n);
    }
    const hits = picks.filter(n => drawn.includes(n)).length;
    const table: Record<number, string> = { 0: '0x', 1: '0x', 2: '0.5x', 3: '1x', 4: '3x', 5: '10x', 6: '50x', 7: '200x', 8: '1000x' };
    const picksStr = picks.sort((a, b) => a - b).map(n => drawn.includes(n) ? `**${n}**` : String(n)).join(' ');
    return `🎯 **Keno** (${PICKS} picks from 1–80, ${DRAWS} drawn)\nYour numbers: ${picksStr}\nMatches: **${hits}/${PICKS}** → **${table[hits]}**!`;
}

// ── Hi-Lo ────────────────────────────────────────────────────────────────────
export function playHiLo(): string {
    const v1 = Math.floor(Math.random() * 13) + 1;
    const v2 = Math.floor(Math.random() * 13) + 1;
    const c1 = `${RANK_LIST[v1 - 1]}${SUIT_LIST[Math.floor(Math.random() * 4)]}`;
    const c2 = `${RANK_LIST[v2 - 1]}${SUIT_LIST[Math.floor(Math.random() * 4)]}`;
    const prediction = v1 >= 7 ? 'lower' : 'higher';
    const actual = v2 > v1 ? 'higher' : v2 < v1 ? 'lower' : 'same';
    const outcome = actual === 'same'
        ? '🤝 Same value — push!'
        : prediction === actual ? '✅ Correct! **2x** win!'
        : '❌ Wrong prediction.';
    return `🎴 **Hi-Lo**\nFirst card: **${c1}**  ·  Prediction: next is **${prediction}**\nNext card: **${c2}**\n${outcome}`;
}

// ── Wheel ────────────────────────────────────────────────────────────────────
export function playWheel(): string {
    const segments = [
        { m: '0x', e: '💀' }, { m: '0x', e: '💀' },
        { m: '0.2x', e: '🔴' }, { m: '0.5x', e: '🟠' },
        { m: '1x',   e: '🟡' }, { m: '1x',   e: '🟡' },
        { m: '1.5x', e: '🟢' }, { m: '2x',   e: '🔵' },
        { m: '3x',   e: '🟣' }, { m: '10x',  e: '💎' },
    ];
    const hit = segments[Math.floor(Math.random() * segments.length)];
    return `🎡 **Wheel**\nSpinning...\nLanded on: ${hit.e} **${hit.m}**!`;
}

// ── Tower ────────────────────────────────────────────────────────────────────
export function playTower(): string {
    const FLOORS = 5, DOORS = 3;
    const steps: string[] = [];
    let cleared = 0;
    let busted = false;
    for (let f = 0; f < FLOORS; f++) {
        const mine = Math.floor(Math.random() * DOORS);
        const pick = Math.floor(Math.random() * DOORS);
        if (pick === mine) {
            busted = true;
            steps.push(`Floor ${f + 1}: 💥 Door ${pick + 1} — Mine!`);
            break;
        }
        cleared++;
        steps.push(`Floor ${f + 1}: ✅ Door ${pick + 1} — Safe`);
    }
    const mults = [0, 1.2, 1.8, 2.5, 4, 8];
    return `🗼 **Tower** (${DOORS} doors, 1 mine/floor)\n${steps.join('\n')}\n${busted ? `Busted at floor ${cleared + 1}` : '🏆 Cleared all floors!'} → **${mults[cleared]}x**`;
}

// ── Video Poker ──────────────────────────────────────────────────────────────
export function playVideoPoker(): string {
    const hand: Card[] = Array.from({ length: 5 }, () => randomCard());
    const rankIdx = (c: Card) => RANK_LIST.indexOf(c.rank);
    const idxs = hand.map(rankIdx).sort((a, b) => a - b);
    const suits = hand.map(c => c.suit);
    const freq: Record<number, number> = {};
    for (const i of idxs) freq[i] = (freq[i] ?? 0) + 1;
    const counts = Object.values(freq).sort((a, b) => b - a);
    const flush    = suits.every(s => s === suits[0]);
    const straight = new Set(idxs).size === 5 && idxs[4] - idxs[0] === 4;
    let name: string, pay: string;
    if      (flush && straight)                       { name = '🌟 Straight Flush';  pay = '50x'; }
    else if (counts[0] === 4)                         { name = '4️⃣ Four of a Kind';  pay = '25x'; }
    else if (counts[0] === 3 && counts[1] === 2)      { name = '🏠 Full House';       pay = '9x';  }
    else if (flush)                                   { name = '🌸 Flush';            pay = '6x';  }
    else if (straight)                                { name = '📈 Straight';         pay = '4x';  }
    else if (counts[0] === 3)                         { name = '3️⃣ Three of a Kind';  pay = '3x';  }
    else if (counts[0] === 2 && counts[1] === 2)      { name = '2️⃣ Two Pair';         pay = '2x';  }
    else if (counts[0] === 2)                         { name = '👥 One Pair';         pay = '1x';  }
    else                                              { name = '❌ High Card';        pay = '0x';  }
    return `🃏 **Video Poker**\nHand: ${hand.map(cardStr).join(' ')}\n${name} → **${pay}**!`;
}
