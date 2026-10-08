/**
 * Pools scanned by default. Each ID was checked on mainnet: prop AMMs by reading a known pool's owner, the others by
 * Helius's parsed source label or by decoding a live pool. Add more with --program.
 */
export const VENUES: Record<string, string> = {
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P": "Pump.fun bonding curve",
  pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA: "PumpSwap",
  cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG: "Meteora DAMM v2",
  LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo: "Meteora DLMM",
  whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc: "Orca Whirlpools",
  CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK: "Raydium CLMM",
  "9H6tua7jkLhdm3w8BvgpTn5LZNU7g4ZynDmCiNN3q6Rp": "HumidiFi",
  SV2EYYJyRz2YhfXwXnhNAevDEui5Q6yrfyo13WtupPF: "SolFi V2",
  BiSoNHVpsVZW2F7rx2eQ59yQwKxzU5NvBcmKshCSUypi: "BisonFi",
  TessVdML9pBGgG9yGks7o4HewRaXVAMuoVj4x83GLQH: "Tessera V",
  ZERor4xhbUycZ6gb9ntrhqscUcZmAbQDjEAtCf4hbZY: "ZeroFi",
  obriQD1zbpyLz95G5n7nJe6a4DPjpFwa5XYPoNm113y: "Obric V2",
};

export const SOL = "So11111111111111111111111111111111111111112";
export const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
