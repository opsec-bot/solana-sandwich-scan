# Spec: solana-sandwich-scan v1

## Goal
An open sandwich detector for Solana that anyone can run over any slot range, and that writes an open dataset: one line
per sandwich with the attacker, every victim, the pool, the signatures and the profit.

A September 2026 paper counted 28.0 million Solana sandwiches from 8,631 bots over three years, but we found no data
or code release. BlockRazor's detector is paid, and Solscan's leaderboard is a web page, not data.

## Pipeline
1. Read every block in the range (`getBlock`, jsonParsed, transaction version 1). Blocks are not sampled, because a
   sandwich can span neighbouring slots.
2. Pull swaps out of each transaction with the IDL-free parser: the token transfers a pool program makes in its CPIs.
   Pump.fun's bonding curve pays SOL out of a sale by editing lamports directly, with no transfer instruction, so for a
   token sold into a pool with no transfer back, the payout is read from the pool authority's lamport drop.
3. Key each swap by pool: program plus the pool's main in and out accounts.
4. Detect sandwiches per pool, in chain order (slot, position in block, instruction).

## Detection rules
A sandwich is a front leg F, one or more victims V, and a back leg B on the same pool, such that:
- F and B are the same actor in different transactions. Same actor = same trader, or same fee payer when that payer
  is not a shared relayer (a payer that pays for `relayerTraders`, default 3, or more distinct traders).
- B sells what F bought: `B.mintIn = F.mintOut`, `B.mintOut = F.mintIn`, and
  `backMin <= B.amountIn / F.amountOut <= backMax` (defaults 0.5 and 1.01). The relaxed lower bound follows the
  Solana rule in the 2026 paper: attackers often keep part of the position.
- Every V lies between F and B, trades the same direction as F, and is a different actor.
- `B.slot - F.slot <= maxSlotGap`. Default 0 (same block). Larger gaps catch "wide" sandwiches spread over a leader's
  consecutive slots, at the cost of also catching some fast momentum trading.
- Profit is positive: `profit = B.amountOut - F.amountIn * (B.amountIn / F.amountOut)`, in F's input token.

Each swap is used in at most one sandwich.

## Why the relayer rule
Found on mainnet while building this: a gasless relayer paid fees for many unrelated traders on the same BisonFi
SOL-USDC pool, and a fee-payer match turned strangers into "attackers" with zero or negative profit. Excluding shared
payers and requiring profit removed every one of those.

## Output
- `sandwiches.jsonl`: program, pool, attacker, front and back legs (signature, slot, position, amounts), victims
  (signature, trader, amounts), profit token, target token, profit, victim volume.
- Summary: count by program, attackers, victims, profit per token, top attackers by SOL profit.

## Victim loss
Not computed in v1. On a constant product pool the victims' loss is at least close to the attacker's gross profit, but
that does not hold for every pool type, so we report attacker profit and victim volume and leave the rest to the
reader.

## CLI
```
sandwich scan --rpc <url> --from <slot> --to <slot> [--max-slot-gap 0] [--program <id>]... > sandwiches.jsonl
sandwich scan --rpc <url> --last <blocks> ...
sandwich summary sandwiches.jsonl
```
