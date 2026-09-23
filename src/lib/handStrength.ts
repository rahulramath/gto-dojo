import { RANK_NAMES, RANK_PLURAL, rankOf, suitOf, type Card } from "./cards";
import { analyzeBoard, nutStraightHigh, STRAIGHT_WINDOWS, type Texture } from "./board";
import { categoryOf, evaluate } from "./evaluator";

export type Bucket = "nutted" | "strong" | "medium" | "weak" | "drawStrong" | "drawWeak" | "air";

export const BUCKETS: Bucket[] = ["nutted", "strong", "medium", "weak", "drawStrong", "drawWeak", "air"];

export const BUCKET_LABEL: Record<Bucket, string> = {
  nutted: "Monster",
  strong: "Strong hand",
  medium: "Medium hand",
  weak: "Weak hand",
  drawStrong: "Big draw",
  drawWeak: "Small draw",
  air: "Nothing yet",
};

export const BUCKET_COLOR: Record<Bucket, string> = {
  nutted: "#a855f7",
  strong: "#ef4444",
  medium: "#f59e0b",
  weak: "#eab308",
  drawStrong: "#38bdf8",
  drawWeak: "#60a5fa",
  air: "#64748b",
};

export interface DrawInfo {
  flushDraw: boolean;
  nutFlushDraw: boolean;
  oesd: boolean;
  doubleGut: boolean;
  gutshot: boolean;
  bdfd: boolean;
  bdsd: boolean;
  overcards: number;
  outs: number;
  labels: string[];
}

export interface HandInfo {
  bucket: Bucket;
  madeBucket: Bucket;
  category: number;
  score: number;
  made: string;
  draws: DrawInfo;
  label: string;
  plays: boolean;
  strength: number;
}

const NO_DRAWS: DrawInfo = {
  flushDraw: false,
  nutFlushDraw: false,
  oesd: false,
  doubleGut: false,
  gutshot: false,
  bdfd: false,
  bdsd: false,
  overcards: 0,
  outs: 0,
  labels: [],
};

function highestMissing(suit: number, board: readonly Card[], exclude: number[] = []): number {
  const onBoard = new Set(board.filter((c) => suitOf(c) === suit).map(rankOf));
  for (let r = 12; r >= 0; r--) if (!onBoard.has(r) && !exclude.includes(r)) return r;
  return -1;
}

function computeDraws(hole: readonly [Card, Card], board: readonly Card[], category: number): DrawInfo {
  if (board.length >= 5 || category >= 4) return NO_DRAWS;
  const all = [hole[0], hole[1], ...board];
  const flop = board.length === 3;
  const labels: string[] = [];
  let flushDraw = false;
  let nutFlushDraw = false;
  let bdfd = false;
  for (let s = 0; s < 4; s++) {
    const cnt = all.filter((c) => suitOf(c) === s).length;
    const heroCards = hole.filter((c) => suitOf(c) === s);
    if (!heroCards.length) continue;
    if (cnt === 4) {
      flushDraw = true;
      const top = Math.max(...heroCards.map(rankOf));
      if (top === highestMissing(s, board)) nutFlushDraw = true;
    } else if (cnt === 3 && flop && heroCards.length === 2) bdfd = true;
  }

  const allMask = all.reduce((m, c) => m | (1 << rankOf(c)), 0);
  const boardMask = board.reduce((m, c) => m | (1 << rankOf(c)), 0);
  const holeRanks = [rankOf(hole[0]), rankOf(hole[1])];
  const outRanks = new Set<number>();
  let bdsd = false;
  STRAIGHT_WINDOWS.forEach((w) => {
    const present = w.filter((r) => allMask & (1 << r)).length;
    const boardPresent = w.filter((r) => boardMask & (1 << r)).length;
    const heroIn = w.some((r) => holeRanks.includes(r) && !(boardMask & (1 << r)));
    if (!heroIn) return;
    if (present === 4 && boardPresent < 4) {
      const missing = w.find((r) => !(allMask & (1 << r)));
      if (missing !== undefined) outRanks.add(missing);
    } else if (present === 3 && flop && boardPresent < 3) bdsd = true;
  });
  let oesd = false;
  let doubleGut = false;
  let gutshot = false;
  if (outRanks.size >= 2) {
    const rs = [...outRanks].map((r) => (r === 12 && !(allMask & (1 << 11)) ? -1 : r)).sort((a, b) => a - b);
    if (rs[rs.length - 1] - rs[0] === 5) oesd = true;
    else doubleGut = true;
  } else if (outRanks.size === 1) gutshot = true;

  const top = Math.max(...board.map(rankOf));
  const overcards = category === 0 ? holeRanks.filter((r) => r > top).length : 0;

  let outs = 0;
  if (flushDraw) outs += 9;
  if (oesd || doubleGut) outs += flushDraw ? 6 : 8;
  else if (gutshot) outs += flushDraw ? 3 : 4;
  if (overcards) outs += overcards * 3;

  if (nutFlushDraw) labels.push("nut flush draw");
  else if (flushDraw) labels.push("flush draw");
  if (oesd) labels.push("open-ended straight draw");
  else if (doubleGut) labels.push("double gutshot");
  else if (gutshot) labels.push("gutshot");
  if (!flushDraw && bdfd) labels.push("backdoor flush draw");
  if (!oesd && !doubleGut && !gutshot && bdsd) labels.push("backdoor straight draw");
  if (overcards === 2) labels.push("two overcards");
  else if (overcards === 1) labels.push("overcard");

  return { flushDraw, nutFlushDraw, oesd, doubleGut, gutshot, bdfd, bdsd, overcards, outs, labels };
}

/** Classify a hand on a flop/turn/river into a strategic bucket with a human-readable label. */
export function classify(hole: readonly [Card, Card], board: readonly Card[], tex: Texture = analyzeBoard(board)): HandInfo {
  const all = [hole[0], hole[1], ...board];
  const score = evaluate(all);
  const cat = categoryOf(score);
  const street = tex.street;
  const bc = new Array(13).fill(0);
  for (const c of board) bc[rankOf(c)]++;
  const h1 = rankOf(hole[0]);
  const h2 = rankOf(hole[1]);
  const hi = Math.max(h1, h2);
  const lo = Math.min(h1, h2);
  const pocket = h1 === h2;
  const top = tex.distinct[0];
  const second = tex.distinct[1] ?? -1;

  let plays = true;
  if (board.length === 5 && evaluate(board) >= score) plays = false;

  let made = "";
  let mb: Bucket = "air";
  let strength = cat / 9;
  const scary = tex.fourFlush || tex.fourStraight;

  const pairLogic = (pr: number, isPocket: boolean, kicker: number) => {
    if (isPocket) {
      if (pr > top) {
        made = `Overpair (${RANK_PLURAL[pr].toLowerCase()})`;
        mb = "strong";
        strength = 0.62 + pr / 60;
      } else if (pr > second) {
        made = `Second pair (pocket ${RANK_PLURAL[pr].toLowerCase()})`;
        mb = "medium";
        strength = 0.45 + pr / 80;
      } else {
        made = `Underpair (pocket ${RANK_PLURAL[pr].toLowerCase()})`;
        mb = "weak";
        strength = 0.3 + pr / 80;
      }
      return;
    }
    if (pr === top) {
      let best = 12;
      while (best === pr || bc[best] > 0) best--;
      const topKicker = kicker === best;
      const good = kicker >= 9 || best - kicker <= 2;
      if (topKicker) {
        made = "Top pair, top kicker";
        mb = "strong";
        strength = 0.6;
      } else if (good) {
        made = "Top pair, good kicker";
        mb = "strong";
        strength = 0.56;
      } else {
        made = "Top pair, weak kicker";
        mb = "medium";
        strength = 0.5;
      }
      if (street === "river" && mb === "strong" && top <= 6) mb = "medium";
    } else if (pr === second) {
      made = "Middle pair";
      mb = street === "river" && kicker < 10 ? "weak" : "medium";
      strength = 0.4 + kicker / 100;
    } else {
      made = pr > tex.distinct[tex.distinct.length - 1] ? "Third pair" : "Bottom pair";
      mb = "weak";
      strength = 0.3 + kicker / 100;
    }
  };

  if (!plays) {
    made = "Playing the board";
    mb = "weak";
    strength = 0.25;
  } else if (cat === 8) {
    made = "Straight flush";
    mb = "nutted";
    strength = 1;
  } else if (cat === 7) {
    made = "Four of a kind";
    mb = "nutted";
    strength = 0.99;
  } else if (cat === 6) {
    made = "Full house";
    mb = tex.trips && !(bc[h1] || bc[h2]) ? "strong" : "nutted";
    strength = 0.95;
  } else if (cat === 5) {
    const fs = [0, 1, 2, 3].find((s) => all.filter((c) => suitOf(c) === s).length >= 5) ?? 0;
    const heroRanks = hole.filter((c) => suitOf(c) === fs).map(rankOf);
    const heroTop = Math.max(...heroRanks);
    const nut = highestMissing(fs, board);
    const second2 = highestMissing(fs, board, [nut]);
    if (heroTop === nut) {
      made = "Nut flush";
      mb = "nutted";
      strength = 0.94;
    } else if (heroTop === second2 && street !== "river") {
      made = "Second-nut flush";
      mb = "nutted";
      strength = 0.9;
    } else if (tex.fourFlush && heroRanks.length === 1 && heroTop < 9) {
      made = "Low flush";
      mb = "medium";
      strength = 0.6;
    } else {
      made = `${RANK_NAMES[heroTop]}-high flush`;
      mb = "strong";
      strength = 0.8 + heroTop / 100;
    }
  } else if (cat === 4) {
    const st = Math.floor(score / 16 ** 4) % 16;
    const nut = nutStraightHigh(board);
    const isNut = st >= nut;
    made = isNut ? "Nut straight" : "Straight";
    if (tex.fourFlush) mb = "medium";
    else if (tex.flushPossible) mb = "strong";
    else mb = isNut ? "nutted" : "strong";
    strength = 0.8 + st / 100;
  } else if (cat === 3) {
    if (pocket && bc[h1] === 1) {
      made = `Set of ${RANK_PLURAL[h1].toLowerCase()}`;
      mb = scary || (street === "river" && (tex.flushPossible || tex.straightPossible)) ? "strong" : "nutted";
      strength = 0.85 + h1 / 100;
    } else if (bc[h1] === 2 || bc[h2] === 2) {
      const k = bc[h1] === 2 ? h2 : h1;
      made = `Trips, ${RANK_NAMES[k].toLowerCase()} kicker`;
      mb = scary ? "medium" : "strong";
      strength = 0.75 + k / 100;
    } else {
      made = "Trips on board";
      mb = hi >= 11 ? "medium" : "weak";
      strength = 0.35;
    }
  } else if (cat === 2) {
    if (!pocket && bc[h1] >= 1 && bc[h2] >= 1 && bc[h1] < 2 && bc[h2] < 2) {
      const topTwo = hi === top && lo === second;
      made = topTwo ? "Top two pair" : hi === top ? "Top and bottom two pair" : "Two pair";
      mb = street === "flop" && topTwo && !scary ? "nutted" : scary ? "medium" : "strong";
      if (street === "flop" && !topTwo && tex.wetness < 0.5) mb = "nutted";
      strength = 0.7 + hi / 100;
    } else if (pocket) {
      pairLogic(h1, true, 0);
    } else if (bc[h1] === 1 || bc[h2] === 1) {
      const pr = bc[h1] === 1 ? h1 : h2;
      pairLogic(pr, false, pr === h1 ? h2 : h1);
    } else {
      made = hi === 12 ? "Ace high (board two pair)" : "Board two pair";
      mb = hi >= 11 ? "weak" : "air";
      strength = 0.2 + hi / 100;
    }
  } else if (cat === 1) {
    if (pocket) pairLogic(h1, true, 0);
    else if (bc[h1] >= 1) pairLogic(h1, false, h2);
    else if (bc[h2] >= 1) pairLogic(h2, false, h1);
    else {
      made = hi === 12 ? "Ace high" : `${RANK_NAMES[hi]} high`;
      mb = hi === 12 ? "weak" : "air";
      strength = 0.15 + hi / 100;
    }
  } else {
    made = hi === 12 ? "Ace high" : `${RANK_NAMES[hi]} high`;
    mb = hi === 12 ? "weak" : "air";
    strength = 0.1 + hi / 100;
  }

  if (street !== "flop" && (mb as Bucket) === "strong" && cat <= 2) {
    const danger = tex.fourFlush || tex.fourStraight || (street === "river" && tex.flushPossible) || (tex.flushPossible && tex.straightPossible);
    if (danger) mb = "medium";
  }

  const draws = computeDraws(hole, board, cat);
  let drawBucket: Bucket | null = null;
  if (street !== "river") {
    const eight = draws.oesd || draws.doubleGut;
    if (draws.flushDraw && (eight || draws.gutshot)) drawBucket = "drawStrong";
    else if (draws.flushDraw || eight) drawBucket = "drawStrong";
    else if (draws.gutshot) drawBucket = "drawWeak";
    else if (street === "flop" && draws.bdfd && (draws.bdsd || draws.overcards >= 1)) drawBucket = "drawWeak";
    else if (street === "flop" && draws.overcards === 2) drawBucket = "drawWeak";
  }

  let bucket: Bucket = mb;
  if (mb === "medium" && drawBucket === "drawStrong") bucket = "strong";
  else if (mb === "weak" && drawBucket === "drawStrong") bucket = "drawStrong";
  else if (mb === "air" && drawBucket) bucket = drawBucket;

  const label = draws.labels.length ? `${made} + ${draws.labels.join(" + ")}` : made;
  return { bucket, madeBucket: mb, category: cat, score, made, draws, label, plays, strength };
}
