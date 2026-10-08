import type { Sandwich } from "./detect.js";
import { SOL, USDC, VENUES } from "./venues.js";

export interface Summary {
  sandwiches: number;
  victims: number;
  attackers: number;
  byProgram: { program: string; name: string; sandwiches: number }[];
  /** Profit summed per profit token. */
  profitByMint: { mint: string; profit: number; sandwiches: number }[];
  /** Attackers ranked by profit in SOL (sandwiches whose profit token is SOL). */
  topAttackersSol: { attacker: string; sandwiches: number; profitSol: number }[];
}

export function summarize(list: Sandwich[]): Summary {
  const count = <K>(keys: K[]) => {
    const m = new Map<K, number>();
    for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
    return m;
  };
  const profit = new Map<string, { profit: number; sandwiches: number }>();
  for (const s of list) {
    const p = profit.get(s.profitMint) ?? { profit: 0, sandwiches: 0 };
    p.profit += s.profit;
    p.sandwiches++;
    profit.set(s.profitMint, p);
  }
  const bySol = new Map<string, { sandwiches: number; profitSol: number }>();
  for (const s of list.filter((x) => x.profitMint === SOL)) {
    const a = bySol.get(s.attacker) ?? { sandwiches: 0, profitSol: 0 };
    a.sandwiches++;
    a.profitSol += s.profit;
    bySol.set(s.attacker, a);
  }
  return {
    sandwiches: list.length,
    victims: list.reduce((n, s) => n + s.victims.length, 0),
    attackers: new Set(list.map((s) => s.attacker)).size,
    byProgram: [...count(list.map((s) => s.program))]
      .map(([program, sandwiches]) => ({ program, name: VENUES[program] ?? program, sandwiches }))
      .sort((a, b) => b.sandwiches - a.sandwiches),
    profitByMint: [...profit].map(([mint, p]) => ({ mint, ...p })).sort((a, b) => b.sandwiches - a.sandwiches),
    topAttackersSol: [...bySol].map(([attacker, a]) => ({ attacker, ...a })).sort((a, b) => b.profitSol - a.profitSol).slice(0, 20),
  };
}

const label = (mint: string) => (mint === SOL ? "SOL" : mint === USDC ? "USDC" : mint);

export function toMarkdown(s: Summary): string {
  return [
    `Sandwiches: ${s.sandwiches}, victims: ${s.victims}, attackers: ${s.attackers}`,
    "",
    "| Program | Sandwiches |",
    "|---|---:|",
    ...s.byProgram.map((p) => `| ${p.name} | ${p.sandwiches} |`),
    "",
    "| Profit token | Sandwiches | Profit |",
    "|---|---:|---:|",
    ...s.profitByMint.map((p) => `| ${label(p.mint)} | ${p.sandwiches} | ${p.profit.toFixed(6)} |`),
    "",
    "| Attacker | Sandwiches | Profit (SOL) |",
    "|---|---:|---:|",
    ...s.topAttackersSol.map((a) => `| \`${a.attacker}\` | ${a.sandwiches} | ${a.profitSol.toFixed(6)} |`),
  ].join("\n");
}
