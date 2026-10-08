import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("cli summary", () => {
  it("summarizes a sandwiches.jsonl file", () => {
    const { expected } = JSON.parse(readFileSync("test/fixtures/sandwiches-pumpfun.json", "utf8"));
    const dir = mkdtempSync(join(tmpdir(), "sandwich-"));
    writeFileSync(join(dir, "s.jsonl"), expected.map((s: unknown) => JSON.stringify(s)).join("\n") + "\n");
    const out = execFileSync(process.execPath, ["--import", "tsx", "src/cli.ts", "summary", join(dir, "s.jsonl")], { encoding: "utf8" });
    expect(out).toContain("Sandwiches: 2, victims: 13, attackers: 2");
  }, 30_000);
});
