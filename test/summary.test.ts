import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Sandwich } from "../src/detect.js";
import { summarize, toMarkdown } from "../src/summary.js";

const { expected } = JSON.parse(readFileSync(new URL("./fixtures/sandwiches-pumpfun.json", import.meta.url), "utf8")) as { expected: Sandwich[] };

describe("summarize", () => {
  it("adds up the real sandwiches", () => {
    const s = summarize(expected);
    expect(s.sandwiches).toBe(2);
    expect(s.victims).toBe(13);
    expect(s.attackers).toBe(2);
    expect(s.byProgram).toEqual([{ program: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", name: "Pump.fun bonding curve", sandwiches: 2 }]);
    expect(s.profitByMint[0]!.profit).toBeCloseTo(0.093220881 + 0.372115526, 6);
    expect(s.topAttackersSol[0]!.attacker).toBe(expected[1]!.attacker);
    expect(toMarkdown(s)).toContain("| Pump.fun bonding curve | 2 |");
  });
});
