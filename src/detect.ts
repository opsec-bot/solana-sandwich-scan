import type { Swap } from "./swaps.js";

export interface DetectOptions {
  /** Front and back may be at most this many slots apart. 0 = same block only. */
  maxSlotGap?: number;
  /** The back leg must sell between these fractions of what the front leg bought. */
  backMin?: number;
  backMax?: number;
  /** Sandwiches must make more than this, in the profit token. */
  minProfit?: number;
  /** A fee payer that pays for this many distinct traders is a shared relayer, not one actor. */
  relayerTraders?: number;
}

export interface Victim {
  signature: string;
  slot: number;
  txIndex: number;
  trader: string;
  amountIn: number;
  amountOut: number;
}

export interface Sandwich {
  program: string;
  pool: string[];
  attacker: string;
  attackerFeePayer: string;
  front: { signature: string; slot: number; txIndex: number; amountIn: number; amountOut: number };
  back: { signature: string; slot: number; txIndex: number; amountIn: number; amountOut: number };
  victims: Victim[];
  /** Token the attacker started and ended in (the front leg's input). Profit is in this token. */
  profitMint: string;
  /** The token bought in the front leg and sold in the back leg. */
  targetMint: string;
  /** Back proceeds minus the cost of the part of the front leg that was sold back. */
  profit: number;
  /** Sum of victims' inputs, in profitMint. */
  victimVolume: number;
}

const DEFAULTS: Required<DetectOptions> = { maxSlotGap: 0, backMin: 0.5, backMax: 1.01, minProfit: 0, relayerTraders: 3 };

const order = (a: Swap, b: Swap) => a.slot - b.slot || a.txIndex - b.txIndex || (a.ixPath < b.ixPath ? -1 : a.ixPath > b.ixPath ? 1 : 0);

/**
 * Finds front, victims, back triples on each pool. Front and back come from the same actor in different transactions;
 * the back sells most of what the front bought and ends in profit; every victim trades the same way as the front,
 * between them, and is a different actor. Each swap is used in at most one sandwich.
 *
 * Same actor means same trader, or same fee payer when that fee payer is not a shared relayer. Gasless relayers pay
 * fees for many unrelated users, and matching on them links strangers.
 */
export function detectSandwiches(swaps: Swap[], opts: DetectOptions = {}): Sandwich[] {
  const o = { ...DEFAULTS, ...opts };
  const tradersOfPayer = new Map<string, Set<string>>();
  for (const s of swaps) {
    const set = tradersOfPayer.get(s.feePayer) ?? new Set<string>();
    set.add(s.trader);
    tradersOfPayer.set(s.feePayer, set);
  }
  const relayer = (payer: string) => (tradersOfPayer.get(payer)?.size ?? 0) >= o.relayerTraders;
  const sameActor = (a: Swap, b: Swap) => a.trader === b.trader || (a.feePayer === b.feePayer && !relayer(a.feePayer));
  const byPool = new Map<string, Swap[]>();
  for (const s of swaps) {
    const key = `${s.program}|${s.poolVaults.join(",")}`;
    const list = byPool.get(key);
    if (list) list.push(s);
    else byPool.set(key, [s]);
  }

  const out: Sandwich[] = [];
  for (const list of byPool.values()) {
    list.sort(order);
    const used = new Set<number>();
    for (let i = 0; i < list.length; i++) {
      if (used.has(i)) continue;
      const f = list[i]!;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j]!;
        if (b.slot - f.slot > o.maxSlotGap) break;
        if (used.has(j) || b.signature === f.signature || !sameActor(f, b)) continue;
        if (b.mintIn !== f.mintOut || b.mintOut !== f.mintIn) continue;
        const ratio = b.amountIn / f.amountOut;
        if (ratio < o.backMin || ratio > o.backMax) continue;
        const profit = b.amountOut - f.amountIn * ratio;
        if (profit <= o.minProfit) continue;
        const victims: number[] = [];
        for (let k = i + 1; k < j; k++) {
          const v = list[k]!;
          if (used.has(k) || sameActor(v, f) || v.mintIn !== f.mintIn || v.mintOut !== f.mintOut) continue;
          if (v.signature === f.signature || v.signature === b.signature) continue;
          victims.push(k);
        }
        if (victims.length === 0) continue;
        for (const k of [i, j, ...victims]) used.add(k);
        out.push({
          program: f.program,
          pool: f.poolVaults,
          attacker: f.trader,
          attackerFeePayer: f.feePayer,
          front: leg(f),
          back: leg(b),
          victims: victims.map((k) => {
            const v = list[k]!;
            return { signature: v.signature, slot: v.slot, txIndex: v.txIndex, trader: v.trader, amountIn: v.amountIn, amountOut: v.amountOut };
          }),
          profitMint: f.mintIn,
          targetMint: f.mintOut,
          profit,
          victimVolume: victims.reduce((s, k) => s + list[k]!.amountIn, 0),
        });
        break;
      }
    }
  }
  return out.sort((a, b) => a.front.slot - b.front.slot || a.front.txIndex - b.front.txIndex);
}

function leg(s: Swap) {
  return { signature: s.signature, slot: s.slot, txIndex: s.txIndex, amountIn: s.amountIn, amountOut: s.amountOut };
}
