# Research notes

Read October 2026.

## Prior work
- *No Place to Hide: An Analysis on Protected Order Flow Sandwich Attacks*, [arXiv:2609.28115](https://arxiv.org/pdf/2609.28115)
  (Category Labs, ETH Zurich, Flashbots, University of Lisbon, September 2026). Six chains, July 2023 to June 2026.
  Solana: 28.0 million sandwiches by 8,631 bots. Its Solana rules differ from the EVM ones and use a relaxed lower bound on
  the back leg. Covers Raydium, Orca Whirlpools, Meteora, Pump.fun, SolFi v1 and Lifinity v2. We found no data or code
  release with it.
- [BlockRazor Sandwich Detector](https://blockrazor.gitbook.io/blockrazor/solana/sandwich-detector): a paid gRPC stream.
- [Solscan sandwich leaderboard](https://info.solscan.io/exploring-sandwiches-activity-leaderboard): a web view, no
  download.
- Press on a three-year study ([Crypto Briefing](https://cryptobriefing.com/jupiter-ultra-sandwich-attacks-study/))
  reports that some protected routes see fewer sandwiches than others.

## Why Solana sandwiches look different
- No public mempool. Attackers see transactions through leaders or RPC paths that forward them, so sandwiches cluster
  around particular leaders and can spread across a leader's consecutive slots.
- Jito bundles let an attacker pin front, victim and back together, but many sandwiches are not bundled.
- Memecoin launch pools (Pump.fun bonding curves, PumpSwap) are the main target: thin liquidity and buyers with high
  slippage settings.

## Checked program IDs
- Prop AMMs: owners of pool accounts listed in LimeChain's pmm-sim config.
- Meteora DAMM v2 (`cpamd...`) and PumpSwap (`pAMMBay...`): Helius's transaction parser labels sample transactions
  `METEORA_DAMM_V2` and `PUMP_AMM`.
- Orca Whirlpools and Raydium CLMM: decoded live SOL-USDC pools owned by them.
- Pump.fun (`6EF8...`): the program behind `...pump` mints in our fixtures.
- Raydium AMM v4 and CPMM are not in the default list because we could not confirm them the same way. Add them with
  `--program`.

## What we found while building it
A 25 block live scan (slots 454659654 to 454659678) gave 3,257 swaps, 494 of them Pump.fun bonding curve sales read
through the lamport fallback, and three profitable sandwiches with a gap of up to two slots, all on Pump.fun bonding
curves. Two of them are the test fixtures.
