// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
type RandomSource = () => number;
const BLACKJACK_RANKS = stryMutAct_9fa48("66") ? [] : (stryCov_9fa48("66"), [stryMutAct_9fa48("67") ? "" : (stryCov_9fa48("67"), 'A'), stryMutAct_9fa48("68") ? "" : (stryCov_9fa48("68"), '2'), stryMutAct_9fa48("69") ? "" : (stryCov_9fa48("69"), '3'), stryMutAct_9fa48("70") ? "" : (stryCov_9fa48("70"), '4'), stryMutAct_9fa48("71") ? "" : (stryCov_9fa48("71"), '5'), stryMutAct_9fa48("72") ? "" : (stryCov_9fa48("72"), '6'), stryMutAct_9fa48("73") ? "" : (stryCov_9fa48("73"), '7'), stryMutAct_9fa48("74") ? "" : (stryCov_9fa48("74"), '8'), stryMutAct_9fa48("75") ? "" : (stryCov_9fa48("75"), '9'), stryMutAct_9fa48("76") ? "" : (stryCov_9fa48("76"), '10'), stryMutAct_9fa48("77") ? "" : (stryCov_9fa48("77"), 'J'), stryMutAct_9fa48("78") ? "" : (stryCov_9fa48("78"), 'Q'), stryMutAct_9fa48("79") ? "" : (stryCov_9fa48("79"), 'K')]);
const PLINKO_MULTIPLIERS = stryMutAct_9fa48("80") ? [] : (stryCov_9fa48("80"), [0.4, 0.7, 1, 1.4, 2, 5, 2, 1.4, 1, 0.7, 0.4]);
const MINE_COUNT = 3;
const MINE_TILES = 9;
function pickIndex(length: number, random: RandomSource) {
  if (stryMutAct_9fa48("81")) {
    {}
  } else {
    stryCov_9fa48("81");
    return Math.floor(stryMutAct_9fa48("82") ? random() / length : (stryCov_9fa48("82"), random() * length));
  }
}
function drawBlackjackCard(random: RandomSource) {
  if (stryMutAct_9fa48("83")) {
    {}
  } else {
    stryCov_9fa48("83");
    return BLACKJACK_RANKS[pickIndex(BLACKJACK_RANKS.length, random)];
  }
}
function getBlackjackValue(hand: string[]) {
  if (stryMutAct_9fa48("84")) {
    {}
  } else {
    stryCov_9fa48("84");
    let total = 0;
    let aces = 0;
    for (const card of hand) {
      if (stryMutAct_9fa48("85")) {
        {}
      } else {
        stryCov_9fa48("85");
        if (stryMutAct_9fa48("88") ? card !== 'A' : stryMutAct_9fa48("87") ? false : stryMutAct_9fa48("86") ? true : (stryCov_9fa48("86", "87", "88"), card === (stryMutAct_9fa48("89") ? "" : (stryCov_9fa48("89"), 'A')))) {
          if (stryMutAct_9fa48("90")) {
            {}
          } else {
            stryCov_9fa48("90");
            stryMutAct_9fa48("91") ? aces -= 1 : (stryCov_9fa48("91"), aces += 1);
            stryMutAct_9fa48("92") ? total -= 11 : (stryCov_9fa48("92"), total += 11);
          }
        } else if (stryMutAct_9fa48("94") ? false : stryMutAct_9fa48("93") ? true : (stryCov_9fa48("93", "94"), (stryMutAct_9fa48("95") ? [] : (stryCov_9fa48("95"), [stryMutAct_9fa48("96") ? "" : (stryCov_9fa48("96"), 'J'), stryMutAct_9fa48("97") ? "" : (stryCov_9fa48("97"), 'Q'), stryMutAct_9fa48("98") ? "" : (stryCov_9fa48("98"), 'K')])).includes(card))) {
          if (stryMutAct_9fa48("99")) {
            {}
          } else {
            stryCov_9fa48("99");
            stryMutAct_9fa48("100") ? total -= 10 : (stryCov_9fa48("100"), total += 10);
          }
        } else {
          if (stryMutAct_9fa48("101")) {
            {}
          } else {
            stryCov_9fa48("101");
            stryMutAct_9fa48("102") ? total -= Number(card) : (stryCov_9fa48("102"), total += Number(card));
          }
        }
      }
    }
    while (stryMutAct_9fa48("104") ? total > 21 || aces > 0 : stryMutAct_9fa48("103") ? false : (stryCov_9fa48("103", "104"), (stryMutAct_9fa48("107") ? total <= 21 : stryMutAct_9fa48("106") ? total >= 21 : stryMutAct_9fa48("105") ? true : (stryCov_9fa48("105", "106", "107"), total > 21)) && (stryMutAct_9fa48("110") ? aces <= 0 : stryMutAct_9fa48("109") ? aces >= 0 : stryMutAct_9fa48("108") ? true : (stryCov_9fa48("108", "109", "110"), aces > 0)))) {
      if (stryMutAct_9fa48("111")) {
        {}
      } else {
        stryCov_9fa48("111");
        stryMutAct_9fa48("112") ? total += 10 : (stryCov_9fa48("112"), total -= 10);
        stryMutAct_9fa48("113") ? aces += 1 : (stryCov_9fa48("113"), aces -= 1);
      }
    }
    return total;
  }
}
function buildMinesBoard(minePositions: Set<number>, pickedTile: number) {
  if (stryMutAct_9fa48("114")) {
    {}
  } else {
    stryCov_9fa48("114");
    const cells: string[] = stryMutAct_9fa48("115") ? ["Stryker was here"] : (stryCov_9fa48("115"), []);

    // Stryker disable next-line EqualityOperator: index 9 is never rendered by the 3x3 board slices.
    for (let index = 0; stryMutAct_9fa48("116") ? false : (stryCov_9fa48("116"), index < MINE_TILES); stryMutAct_9fa48("119") ? index -= 1 : (stryCov_9fa48("119"), index += 1)) {
      if (stryMutAct_9fa48("120")) {
        {}
      } else {
        stryCov_9fa48("120");
        if (stryMutAct_9fa48("123") ? index !== pickedTile : stryMutAct_9fa48("122") ? false : stryMutAct_9fa48("121") ? true : (stryCov_9fa48("121", "122", "123"), index === pickedTile)) {
          if (stryMutAct_9fa48("124")) {
            {}
          } else {
            stryCov_9fa48("124");
            cells.push(minePositions.has(index) ? stryMutAct_9fa48("125") ? "" : (stryCov_9fa48("125"), '💥') : stryMutAct_9fa48("126") ? "" : (stryCov_9fa48("126"), '💎'));
            continue;
          }
        }
        cells.push(stryMutAct_9fa48("127") ? "" : (stryCov_9fa48("127"), '⬜'));
      }
    }
    return (stryMutAct_9fa48("128") ? [] : (stryCov_9fa48("128"), [stryMutAct_9fa48("129") ? cells.join(' ') : (stryCov_9fa48("129"), cells.slice(0, 3).join(stryMutAct_9fa48("130") ? "" : (stryCov_9fa48("130"), ' '))), stryMutAct_9fa48("131") ? cells.join(' ') : (stryCov_9fa48("131"), cells.slice(3, 6).join(stryMutAct_9fa48("132") ? "" : (stryCov_9fa48("132"), ' '))), stryMutAct_9fa48("133") ? cells.join(' ') : (stryCov_9fa48("133"), cells.slice(6, 9).join(stryMutAct_9fa48("134") ? "" : (stryCov_9fa48("134"), ' ')))])).join(stryMutAct_9fa48("135") ? "" : (stryCov_9fa48("135"), '\n'));
  }
}
export function playBlackjack(random: RandomSource = Math.random): string {
  if (stryMutAct_9fa48("136")) {
    {}
  } else {
    stryCov_9fa48("136");
    const playerHand = stryMutAct_9fa48("137") ? [] : (stryCov_9fa48("137"), [drawBlackjackCard(random), drawBlackjackCard(random)]);
    const dealerHand = stryMutAct_9fa48("138") ? [] : (stryCov_9fa48("138"), [drawBlackjackCard(random), drawBlackjackCard(random)]);
    while (stryMutAct_9fa48("141") ? getBlackjackValue(playerHand) >= 16 : stryMutAct_9fa48("140") ? getBlackjackValue(playerHand) <= 16 : stryMutAct_9fa48("139") ? false : (stryCov_9fa48("139", "140", "141"), getBlackjackValue(playerHand) < 16)) {
      if (stryMutAct_9fa48("142")) {
        {}
      } else {
        stryCov_9fa48("142");
        playerHand.push(drawBlackjackCard(random));
      }
    }
    while (stryMutAct_9fa48("145") ? getBlackjackValue(dealerHand) >= 17 : stryMutAct_9fa48("144") ? getBlackjackValue(dealerHand) <= 17 : stryMutAct_9fa48("143") ? false : (stryCov_9fa48("143", "144", "145"), getBlackjackValue(dealerHand) < 17)) {
      if (stryMutAct_9fa48("146")) {
        {}
      } else {
        stryCov_9fa48("146");
        dealerHand.push(drawBlackjackCard(random));
      }
    }
    const playerTotal = getBlackjackValue(playerHand);
    const dealerTotal = getBlackjackValue(dealerHand);
    let verdict = stryMutAct_9fa48("147") ? "" : (stryCov_9fa48("147"), 'Push');
    if (stryMutAct_9fa48("151") ? playerTotal <= 21 : stryMutAct_9fa48("150") ? playerTotal >= 21 : stryMutAct_9fa48("149") ? false : stryMutAct_9fa48("148") ? true : (stryCov_9fa48("148", "149", "150", "151"), playerTotal > 21)) {
      if (stryMutAct_9fa48("152")) {
        {}
      } else {
        stryCov_9fa48("152");
        verdict = stryMutAct_9fa48("153") ? "" : (stryCov_9fa48("153"), 'Dealer wins');
      }
    } else if (stryMutAct_9fa48("156") ? dealerTotal > 21 && playerTotal > dealerTotal : stryMutAct_9fa48("155") ? false : stryMutAct_9fa48("154") ? true : (stryCov_9fa48("154", "155", "156"), (stryMutAct_9fa48("159") ? dealerTotal <= 21 : stryMutAct_9fa48("158") ? dealerTotal >= 21 : stryMutAct_9fa48("157") ? false : (stryCov_9fa48("157", "158", "159"), dealerTotal > 21)) || (stryMutAct_9fa48("162") ? playerTotal <= dealerTotal : stryMutAct_9fa48("161") ? playerTotal >= dealerTotal : stryMutAct_9fa48("160") ? false : (stryCov_9fa48("160", "161", "162"), playerTotal > dealerTotal)))) {
      if (stryMutAct_9fa48("163")) {
        {}
      } else {
        stryCov_9fa48("163");
        verdict = stryMutAct_9fa48("164") ? "" : (stryCov_9fa48("164"), 'Player wins');
      }
    } else if (stryMutAct_9fa48("168") ? dealerTotal <= playerTotal : stryMutAct_9fa48("167") ? dealerTotal >= playerTotal : stryMutAct_9fa48("166") ? false : stryMutAct_9fa48("165") ? true : (stryCov_9fa48("165", "166", "167", "168"), dealerTotal > playerTotal)) {
      if (stryMutAct_9fa48("169")) {
        {}
      } else {
        stryCov_9fa48("169");
        verdict = stryMutAct_9fa48("170") ? "" : (stryCov_9fa48("170"), 'Dealer wins');
      }
    }
    return stryMutAct_9fa48("171") ? `` : (stryCov_9fa48("171"), `🃏 Blackjack\nPlayer: ${playerHand.join(stryMutAct_9fa48("172") ? "" : (stryCov_9fa48("172"), ' '))} (${playerTotal})\nDealer: ${dealerHand.join(stryMutAct_9fa48("173") ? "" : (stryCov_9fa48("173"), ' '))} (${dealerTotal})\nResult: **${verdict}**`);
  }
}
export function playPlinko(random: RandomSource = Math.random): string {
  if (stryMutAct_9fa48("174")) {
    {}
  } else {
    stryCov_9fa48("174");
    const pathSteps: string[] = stryMutAct_9fa48("175") ? ["Stryker was here"] : (stryCov_9fa48("175"), []);
    let position = Math.floor(stryMutAct_9fa48("176") ? (PLINKO_MULTIPLIERS.length - 1) * 2 : (stryCov_9fa48("176"), (stryMutAct_9fa48("177") ? PLINKO_MULTIPLIERS.length + 1 : (stryCov_9fa48("177"), PLINKO_MULTIPLIERS.length - 1)) / 2));
    for (let step = 0; stryMutAct_9fa48("180") ? step >= 6 : stryMutAct_9fa48("179") ? step <= 6 : stryMutAct_9fa48("178") ? false : (stryCov_9fa48("178", "179", "180"), step < 6); stryMutAct_9fa48("181") ? step -= 1 : (stryCov_9fa48("181"), step += 1)) {
      if (stryMutAct_9fa48("182")) {
        {}
      } else {
        stryCov_9fa48("182");
        const direction = (stryMutAct_9fa48("186") ? random() >= 0.5 : stryMutAct_9fa48("185") ? random() <= 0.5 : stryMutAct_9fa48("184") ? false : stryMutAct_9fa48("183") ? true : (stryCov_9fa48("183", "184", "185", "186"), random() < 0.5)) ? stryMutAct_9fa48("187") ? "" : (stryCov_9fa48("187"), 'L') : stryMutAct_9fa48("188") ? "" : (stryCov_9fa48("188"), 'R');
        pathSteps.push(direction);
        if (stryMutAct_9fa48("191") ? direction !== 'L' : stryMutAct_9fa48("190") ? false : stryMutAct_9fa48("189") ? true : (stryCov_9fa48("189", "190", "191"), direction === (stryMutAct_9fa48("192") ? "" : (stryCov_9fa48("192"), 'L')))) {
          if (stryMutAct_9fa48("193")) {
            {}
          } else {
            stryCov_9fa48("193");
            position = stryMutAct_9fa48("194") ? Math.min(0, position - 1) : (stryCov_9fa48("194"), Math.max(0, stryMutAct_9fa48("195") ? position + 1 : (stryCov_9fa48("195"), position - 1)));
          }
        } else {
          if (stryMutAct_9fa48("196")) {
            {}
          } else {
            stryCov_9fa48("196");
            position = stryMutAct_9fa48("197") ? Math.max(PLINKO_MULTIPLIERS.length - 1, position + 1) : (stryCov_9fa48("197"), Math.min(stryMutAct_9fa48("198") ? PLINKO_MULTIPLIERS.length + 1 : (stryCov_9fa48("198"), PLINKO_MULTIPLIERS.length - 1), stryMutAct_9fa48("199") ? position - 1 : (stryCov_9fa48("199"), position + 1)));
          }
        }
      }
    }
    const multiplier = PLINKO_MULTIPLIERS[position];
    const lane = stryMutAct_9fa48("200") ? position - 1 : (stryCov_9fa48("200"), position + 1);
    return stryMutAct_9fa48("201") ? `` : (stryCov_9fa48("201"), `🔵 Plinko\nPath: ${pathSteps.join(stryMutAct_9fa48("202") ? "" : (stryCov_9fa48("202"), ' -> '))}\nLanding slot: ${lane}\nPayout: **${multiplier.toFixed(1)}x**`);
  }
}
export function playMines(random: RandomSource = Math.random): string {
  if (stryMutAct_9fa48("203")) {
    {}
  } else {
    stryCov_9fa48("203");
    const minePositions = new Set<number>();
    let attempts = 0;
    while (stryMutAct_9fa48("205") ? minePositions.size < MINE_COUNT || attempts < 100 : stryMutAct_9fa48("204") ? false : (stryCov_9fa48("204", "205"), (stryMutAct_9fa48("208") ? minePositions.size >= MINE_COUNT : stryMutAct_9fa48("207") ? minePositions.size <= MINE_COUNT : stryMutAct_9fa48("206") ? true : (stryCov_9fa48("206", "207", "208"), minePositions.size < MINE_COUNT)) && (stryMutAct_9fa48("211") ? attempts >= 100 : stryMutAct_9fa48("210") ? attempts <= 100 : stryMutAct_9fa48("209") ? true : (stryCov_9fa48("209", "210", "211"), attempts < 100)))) {
      if (stryMutAct_9fa48("212")) {
        {}
      } else {
        stryCov_9fa48("212");
        minePositions.add(pickIndex(MINE_TILES, random));
        stryMutAct_9fa48("213") ? attempts -= 1 : (stryCov_9fa48("213"), attempts += 1);
      }
    }
    // Fallback: place remaining mines sequentially
    for (let i = 0; stryMutAct_9fa48("216") ? minePositions.size >= MINE_COUNT : stryMutAct_9fa48("215") ? minePositions.size <= MINE_COUNT : stryMutAct_9fa48("214") ? false : (stryCov_9fa48("214", "215", "216"), minePositions.size < MINE_COUNT); stryMutAct_9fa48("217") ? i -= 1 : (stryCov_9fa48("217"), i += 1)) {
      if (stryMutAct_9fa48("218")) {
        {}
      } else {
        stryCov_9fa48("218");
        minePositions.add(i);
      }
    }
    const pickedTile = pickIndex(MINE_TILES, random);
    const safePick = stryMutAct_9fa48("219") ? minePositions.has(pickedTile) : (stryCov_9fa48("219"), !minePositions.has(pickedTile));
    const safeTiles = stryMutAct_9fa48("220") ? MINE_TILES + MINE_COUNT : (stryCov_9fa48("220"), MINE_TILES - MINE_COUNT);
    // Stryker disable next-line StringLiteral: fallback value is unreachable because boom returns early.
    const multiplier = safePick ? (stryMutAct_9fa48("221") ? 1 - MINE_COUNT / safeTiles : (stryCov_9fa48("221"), 1 + (stryMutAct_9fa48("222") ? MINE_COUNT * safeTiles : (stryCov_9fa48("222"), MINE_COUNT / safeTiles)))).toFixed(2) : '0.00';
    const board = buildMinesBoard(minePositions, pickedTile);
    if (stryMutAct_9fa48("226") ? false : stryMutAct_9fa48("225") ? true : stryMutAct_9fa48("224") ? safePick : (stryCov_9fa48("224", "225", "226"), !safePick)) {
      if (stryMutAct_9fa48("227")) {
        {}
      } else {
        stryCov_9fa48("227");
        return stryMutAct_9fa48("228") ? `` : (stryCov_9fa48("228"), `💣 Mines\nPick: tile ${stryMutAct_9fa48("229") ? pickedTile - 1 : (stryCov_9fa48("229"), pickedTile + 1)}\n${board}\nResult: **Boom**`);
      }
    }
    return stryMutAct_9fa48("230") ? `` : (stryCov_9fa48("230"), `💣 Mines\nPick: tile ${stryMutAct_9fa48("231") ? pickedTile - 1 : (stryCov_9fa48("231"), pickedTile + 1)}\n${board}\nResult: **Safe** at ${multiplier}x`);
  }
}