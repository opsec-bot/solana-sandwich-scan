# solana-sandwich-scan

An open sandwich attack detector for Solana that builds an open dataset.

A 2026 study counted 28 million Solana sandwiches over three years, but released no data or code that we could find.
The detectors that exist are paid streams or web leaderboards. This one runs on any RPC, over any slot range, and
writes one JSON line per sandwich with the attacker, every victim, the pool, the signatures and the profit.

## How it works
1. Reads every block in the range. No sampling, since a sandwich can span neighbouring slots.
2. Pulls swaps out of each transaction without IDLs, from the token transfers each pool program makes. Pump.fun's
   bonding curve pays out sales by editing lamports directly, so those payouts are read from the curve's balance change.
3. Groups swaps by pool and looks for a front leg, victims, and a back leg:
   - front and back by the same actor, in different transactions
   - the back sells 50% to 101% of what the front bought, and makes a profit
   - victims trade the same direction, in between, and are someone else
   - front and back at most `--max-slot-gap` slots apart (default 0, same block)

One rule came from mainnet data while building this: gasless relayers pay fees for many unrelated users, so a fee
payer only links two wallets if it pays for fewer than 3 traders. Without that, strangers on a busy pool got flagged.

Default venues: Pump.fun bonding curve, PumpSwap, Meteora DAMM v2, Meteora DLMM, Orca Whirlpools, Raydium CLMM and six
prop AMMs. Each ID was checked on mainnet (see [docs/RESEARCH.md](docs/RESEARCH.md)). Add others with `--program`.

## Try it
Needs Node 22 or newer.

```sh
npm install
npm test

npx tsx src/cli.ts scan --rpc https://api.mainnet-beta.solana.com --last 40 --max-slot-gap 2 --concurrency 1 > sandwiches.jsonl
npx tsx src/cli.ts summary sandwiches.jsonl
```

The tests include two real Pump.fun cases from mainnet. In one, the "attacker" turned out to be the token's creator:
they bought 5% of the supply in the creation transaction, four buyers put in 4.1 SOL right after, and the creator sold
one slot later for 0.37 SOL profit. The pattern is the same as a sandwich, so the detector reports it. Telling a
creator's launch dump from a third-party attack needs one more check: whether the front leg is the token's creation
transaction.

[docs/sample-2026-10-08.md](docs/sample-2026-10-08.md) has a 40 block scan. In both samples we ran, every sandwich
crossed a slot boundary and the strict same-block default found none. That is worth knowing if you compare against
studies that only count same-block attacks.

Full rules in [docs/SPEC.md](docs/SPEC.md).

## Limits
- Victim loss is not computed. We report attacker profit and victim volume.
- Wider slot gaps also catch fast momentum trading. Check the timing before calling one an attack.
- A creator who buys at launch and sells into early buyers matches the same pattern as an attack.
- Attackers that route through an unlisted pool program, or use unrelated wallets with no shared fee payer, are missed.

## License
MIT
