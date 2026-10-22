import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkRoku, ROKU_DIR } from "../../scripts/roku.ts";

// The BrightScript helpers run in an off-device interpreter; the screens can only be checked for
// errors here and have to be tried on a real Roku.
const BRS_CLI = join(ROKU_DIR, "..", "node_modules", "@rokucommunity", "brs", "bin", "cli.js");

describe("Roku app", () => {
  it("passes its BrightScript helper tests", () => {
    const run = spawnSync(
      process.execPath,
      [BRS_CLI, join(ROKU_DIR, "components", "lib", "helpers.brs"), join(ROKU_DIR, "tests", "helpers.test.brs")],
      { encoding: "utf8", timeout: 60_000 },
    );
    const output = `${run.stdout}\n${run.stderr}`;
    const failures = output.split("\n").filter((line) => line.startsWith("FAIL:"));
    expect(failures).toEqual([]);
    const result = /RESULT passed=(\d+) failed=(\d+)/.exec(output);
    expect(result, output).not.toBeNull();
    expect(Number(result![2])).toBe(0);
    expect(Number(result![1])).toBeGreaterThan(40);
  });

  it("has no BrightScript errors", async () => {
    const configPath = join(mkdtempSync(join(tmpdir(), "ms-roku-")), "config.brs");
    expect(await checkRoku(configPath)).toEqual([]);
  }, 60_000);
});
