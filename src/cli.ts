#!/usr/bin/env -S npx tsx
import { readFileSync } from "node:fs";
import { detectSandwiches, type Sandwich } from "./detect.js";
import { Rpc } from "./rpc.js";
import { scanSwaps } from "./scan.js";
import { summarize, toMarkdown } from "./summary.js";
import { VENUES } from "./venues.js";

const USAGE = `Usage:
  sandwich scan --rpc <url> --from <slot> --to <slot> [--max-slot-gap 0] [--program <id>]... [--concurrency N]   > sandwiches.jsonl
  sandwich scan --rpc <url> --last <blocks> ...
  sandwich summary <sandwiches.jsonl> [--json]`;

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
}

function flags(args: string[], name: string): string[] {
  const out: string[] = [];
  for (let v = flag(args, name); v !== undefined; v = flag(args, name)) out.push(v);
  return out;
}

function bool(args: string[], name: string): boolean {
  const i = args.indexOf(name);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
}

async function main(argv: string[]): Promise<number> {
  const [cmd, ...args] = argv;
  if (cmd === "scan") {
    const url = flag(args, "--rpc") ?? process.env.SOLANA_RPC_URL;
    if (!url) return usage();
    const rpc = new Rpc(url);
    const last = flag(args, "--last");
    let from = Number(flag(args, "--from"));
    let to = Number(flag(args, "--to"));
    if (last) {
      to = await rpc.getSlot();
      from = to - Number(last) + 1;
    }
    if (!Number.isFinite(from) || !Number.isFinite(to)) return usage();
    const maxSlotGap = Number(flag(args, "--max-slot-gap") ?? 0);
    const programs = new Set([...Object.keys(VENUES), ...flags(args, "--program")]);
    let blocks = 0;
    let total = 0;
    const swaps = await scanSwaps(rpc, {
      from,
      to,
      programs,
      concurrency: Number(flag(args, "--concurrency") ?? 2),
      onBlock: (_s, n) => {
        blocks++;
        total += n;
        process.stderr.write(`\rblocks ${blocks}, swaps ${total}`);
      },
    });
    const found = detectSandwiches(swaps, { maxSlotGap });
    process.stderr.write(`\nslots ${from}-${to}: ${found.length} sandwiches\n`);
    for (const s of found) process.stdout.write(JSON.stringify(s) + "\n");
    return 0;
  }
  if (cmd === "summary") {
    const json = bool(args, "--json");
    if (!args[0]) return usage();
    const list = readFileSync(args[0], "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Sandwich);
    const s = summarize(list);
    process.stdout.write((json ? JSON.stringify(s, null, 2) : toMarkdown(s)) + "\n");
    return 0;
  }
  return usage();
}

function usage(): number {
  process.stderr.write(USAGE + "\n");
  return 1;
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err) => {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  },
);
