import { pool, type Rpc } from "./rpc.js";
import { extractSwaps, type ParsedTx, type Swap } from "./swaps.js";
import { VENUES } from "./venues.js";

/** Every swap on `programs` in one block's transactions, with block positions. */
export function swapsFromBlock(txs: ParsedTx[], programs: ReadonlySet<string> = new Set(Object.keys(VENUES))): Swap[] {
  return txs.flatMap((tx, i) => extractSwaps(tx, programs, i));
}

export interface ScanOptions {
  from: number;
  to: number;
  programs?: ReadonlySet<string>;
  concurrency?: number;
  onBlock?: (slot: number, swaps: number) => void;
}

/** Swaps from every block in [from, to]. Sandwiches can span neighbouring slots, so blocks are not sampled. */
export async function scanSwaps(rpc: Rpc, opts: ScanOptions): Promise<Swap[]> {
  const slots: number[] = [];
  for (let s = opts.from; s <= opts.to; s += 500_000) slots.push(...(await rpc.getBlocks(s, Math.min(opts.to, s + 499_999))));
  const perBlock = await pool(slots, opts.concurrency ?? 2, async (slot) => {
    const txs = await rpc.getBlock(slot);
    const swaps = txs ? swapsFromBlock(txs, opts.programs) : [];
    opts.onBlock?.(slot, swaps.length);
    return swaps;
  });
  return perBlock.flat();
}
