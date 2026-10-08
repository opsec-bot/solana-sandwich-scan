import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { detectSandwiches, type Sandwich } from "../src/detect.js";
import { extractSwaps, type ParsedTx, type Swap } from "../src/swaps.js";
import { VENUES } from "../src/venues.js";

const fx = JSON.parse(readFileSync(new URL("./fixtures/sandwiches-pumpfun.json", import.meta.url), "utf8")) as {
  expected: Sandwich[];
  transactions: (ParsedTx & { transactionIndex: number })[];
};

describe("real pump.fun sandwiches", () => {
  const programs = new Set(Object.keys(VENUES));
  const swaps = fx.transactions.flatMap((t) => extractSwaps(t, programs, t.transactionIndex));

  it("finds both, with the same attackers, victims and profit as the live scan", () => {
    const found = detectSandwiches(swaps, { maxSlotGap: 2 });
    expect(found).toHaveLength(2);
    for (const [i, s] of found.entries()) {
      const want = fx.expected[i]!;
      expect(s.attacker).toBe(want.attacker);
      expect(s.victims.map((v) => v.signature)).toEqual(want.victims.map((v) => v.signature));
      expect(s.profit).toBeCloseTo(want.profit, 9);
    }
    expect(found[1]!.profit).toBeCloseTo(0.372115526, 9); // SOL
    expect(found[1]!.victims).toHaveLength(4);
  });

  it("finds none with the strict same-block default, since both span slots", () => {
    expect(detectSandwiches(swaps)).toEqual([]);
  });
});

describe("rules", () => {
  let n = 0;
  const swap = (o: Partial<Swap>): Swap => ({
    signature: `sig${n++}`,
    slot: 1,
    blockTime: 0,
    txIndex: n,
    ixPath: "0.0",
    program: "P",
    trader: "t",
    feePayer: "t",
    poolVaults: ["a", "b"],
    mintIn: "SOL",
    amountIn: 1,
    mintOut: "TOK",
    amountOut: 100,
    ...o,
  });
  const front = () => swap({ trader: "atk", feePayer: "atk", amountIn: 1, amountOut: 100 });
  const victim = (who = "v") => swap({ trader: who, feePayer: who, amountIn: 2, amountOut: 190 });
  const back = (out = 1.2) => swap({ trader: "atk", feePayer: "atk", mintIn: "TOK", mintOut: "SOL", amountIn: 100, amountOut: out });

  it("detects a basic sandwich and its profit", () => {
    const [s] = detectSandwiches([front(), victim(), back()]);
    expect(s!.profit).toBeCloseTo(0.2, 9);
    expect(s!.victimVolume).toBe(2);
    expect(s!.profitMint).toBe("SOL");
  });

  it("needs a victim, a profit and the back leg in another transaction", () => {
    expect(detectSandwiches([front(), back()])).toEqual([]);
    expect(detectSandwiches([front(), victim(), back(0.9)])).toEqual([]);
    const f = front();
    expect(detectSandwiches([f, victim(), { ...back(), signature: f.signature }])).toEqual([]);
  });

  it("does not link strangers who share a gasless relayer", () => {
    const viaRelayer = (who: string, o: Partial<Swap>) => swap({ trader: who, feePayer: "relayer", ...o });
    const swaps = [
      viaRelayer("a", {}),
      viaRelayer("b", { amountIn: 2, amountOut: 190 }),
      viaRelayer("c", { mintIn: "TOK", mintOut: "SOL", amountIn: 100, amountOut: 1.2 }),
    ];
    expect(detectSandwiches(swaps)).toEqual([]);
  });

  it("links an attacker's two wallets through a private fee payer", () => {
    const f = swap({ trader: "w1", feePayer: "boss" });
    const v = victim();
    const b = swap({ trader: "w2", feePayer: "boss", mintIn: "TOK", mintOut: "SOL", amountIn: 100, amountOut: 1.2 });
    const [s] = detectSandwiches([f, v, b]);
    expect(s!.attackerFeePayer).toBe("boss");
  });

  it("keeps pools apart and uses each swap once", () => {
    const other = (s: Swap) => ({ ...s, poolVaults: ["c", "d"] });
    expect(detectSandwiches([front(), other(victim()), back()])).toEqual([]);
    expect(detectSandwiches([front(), victim(), back(), back()])).toHaveLength(1);
  });

  it("respects the slot gap", () => {
    const late = { ...back(), slot: 3 };
    expect(detectSandwiches([front(), victim(), late])).toEqual([]);
    expect(detectSandwiches([front(), victim(), late], { maxSlotGap: 2 })).toHaveLength(1);
  });
});
